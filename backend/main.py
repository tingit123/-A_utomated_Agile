from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import pandas as pd
from datetime import datetime, timedelta
import joblib
import random
import time
from collections import defaultdict

app = FastAPI(title="Agile Metrics AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN","")

try:
    risk_model = joblib.load("models/sprint_risk_model.pkl")
    print("Da tai thanh cong mo hinh AI!")
except:
    risk_model = None
    print("Canh bao: Khong tim thay file models/sprint_risk_model.pkl.")

# ========== HÀM HEURISTIC: ESTIMATE STORY POINTS ==========
def estimate_story_points(issue):
    for label in issue.get('labels', []):
        if isinstance(label, dict):
            label_name = label.get('name', '')
            if label_name.upper().startswith('SP:'):
                try: return int(label_name.split(':')[1].strip())
                except: pass
    
    title_upper = issue['title'].upper()
    labels_lower = [l['name'].lower() for l in issue.get('labels', []) if isinstance(l, dict)]
    
    if '[BUG]' in title_upper or 'bug' in labels_lower or 'type: bug' in labels_lower: base_sp = 2
    elif '[DOCS]' in title_upper or '[DOC]' in title_upper or 'documentation' in labels_lower: base_sp = 1
    elif '[FEAT]' in title_upper or '[FEATURE]' in title_upper or 'feature' in labels_lower: base_sp = 5
    elif '[ENHANCE]' in title_upper or '[IMPROVEMENT]' in title_upper: base_sp = 5
    elif '[CHORE]' in title_upper or 'chore' in labels_lower: base_sp = 1
    else: base_sp = 3
    
    title_length = len(issue['title'])
    if title_length > 60: base_sp += 2
    elif title_length > 40: base_sp += 1
    
    comments_count = issue.get('comments', 0)
    if comments_count > 20: base_sp += 3
    elif comments_count > 10: base_sp += 2
    elif comments_count > 5: base_sp += 1
    
    return min(max(base_sp, 1), 13)

# ========== HÀM NLP: ANALYZE DESCRIPTION QUALITY ==========
def analyze_nlp_description(issue):
    title = issue['title'].strip()
    body = issue.get('body') or ''
    
    if not title or len(title) < 5: return "⚠️ Tieu de trong", False
    title_words = len(title.split())
    if title_words < 3: return "⚠️ Tieu de qua ngan", False
    
    body_length = len(body.strip())
    if body_length == 0: return "⚠️ Mo ta trong", False
    elif body_length < 20: return "⚠️ Mo ta qua ngan", False
    
    label_count = len(issue.get('labels', []))
    if label_count == 0: return "✓ Tuong doi", True
    
    body_lower = body.lower()
    has_steps = any(kw in body_lower for kw in ['step', 'bước', 'cách', 'how to', 'làm thế nào'])
    has_expected = any(kw in body_lower for kw in ['expect', 'should', 'kỳ vọng', 'nên'])
    has_actual = any(kw in body_lower for kw in ['actual', 'current', 'hiện tại', 'thực tế'])
    
    quality_score = 0
    if has_steps: quality_score += 1
    if has_expected: quality_score += 1
    if has_actual: quality_score += 1
    if len(title) > 30: quality_score += 1
    if body_length > 100: quality_score += 1
    
    if quality_score >= 4: return "✅ Chi tiet", True
    elif quality_score >= 2: return "✓ Tuong doi", True
    else: return "⚠️ Mo ho", False

# ========== HÀM BURNDOWN ==========
def calculate_burndown_data(issues, start_project_date):
    tasks_by_date = defaultdict(lambda: {"closed": 0, "created": 0})
    all_dates = set()
    total_created_sp = 0 # Lưu tổng số SP của toàn bộ dự án
    
    for issue in issues:
        if 'pull_request' in issue: continue
        
        sp = estimate_story_points(issue)
        
        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        created_date = created_at.date()
        all_dates.add(created_date)
        tasks_by_date[created_date]["created"] += sp
        total_created_sp += sp # Cộng dồn để có đỉnh SP cao nhất lúc bắt đầu
        
        if issue['state'] == 'closed' and issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            closed_date = closed_at.date()
            all_dates.add(closed_date)
            tasks_by_date[closed_date]["closed"] += sp
            
    burndown = []
    if all_dates:
        min_date = start_project_date
        max_date = max(all_dates)
        if max_date < min_date: max_date = min_date
        
        tasks_remaining = total_created_sp # Biểu đồ bắt đầu từ Tổng lượng SP
        tasks_closed_cum = 0
        current_date = min_date
        
        while current_date <= max_date:
            # Trừ dần những task đã hoàn thành để đường thẳng cắm xuống
            tasks_remaining -= tasks_by_date[current_date]["closed"]
            tasks_closed_cum += tasks_by_date[current_date]["closed"]
            
            sprint_num = (current_date - start_project_date).days // 14 + 1
            
            burndown.append({
                "date": current_date.strftime("%d/%m"),
                "tasksRemaining": max(tasks_remaining, 0),
                "tasksClosed": tasks_closed_cum,
                "sprint": f"Sprint {sprint_num}"
            })
            current_date += timedelta(days=1)
            
    return burndown

# ========== HÀM PRODUCTIVITY ==========
def calculate_team_productivity(issues, start_project_date):
    tasks_per_day = defaultdict(int)
    max_date = start_project_date
    
    for issue in issues:
        if 'pull_request' in issue or issue['state'] != 'closed': continue
        if issue['closed_at']:
            closed_date = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ").date()
            tasks_per_day[closed_date] += 1
            if closed_date > max_date: max_date = closed_date
            
    tasks_per_period_list = []
    current_date = start_project_date
    total_completed = 0
    total_days = (max_date - start_project_date).days + 1
    
    while current_date <= max_date:
        completed = tasks_per_day[current_date]
        total_completed += completed
        sprint_num = (current_date - start_project_date).days // 14 + 1
        
        tasks_per_period_list.append({
            "date": current_date.strftime("%d/%m"),
            "completed": completed,
            "sprint": f"Sprint {sprint_num}"
        })
        current_date += timedelta(days=1)
        
    avg_productivity = total_completed / max(total_days, 1)
    return {"teamProductivity": round(avg_productivity, 2), "tasksPerDay": tasks_per_period_list}

# ========== MAIN ENDPOINT ==========
@app.get("/api/metrics/{owner}/{repo}")
async def get_agile_metrics(owner: str, repo: str):
    headers = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    
    issues = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=all&per_page=100&page={page}"
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            if page == 1: raise HTTPException(status_code=response.status_code, detail="Loi ket noi GitHub API")
            break
            
        batch = response.json()
        if not batch: break
            
        issues.extend(batch)
        page += 1
        time.sleep(0.2)

    if not issues:
        raise HTTPException(status_code=404, detail="Khong tim thay du lieu")

    all_created_dates = [datetime.strptime(i['created_at'], "%Y-%m-%dT%H:%M:%SZ").date() for i in issues if 'pull_request' not in i]
    start_project_date = min(all_created_dates) if all_created_dates else datetime.now().date()

    tasks = []
    kanban = {"todo": [], "inProgress": [], "done": []}
    members_data = {} 
    
    for issue in issues:
        if 'pull_request' in issue: continue
        
        sp = estimate_story_points(issue)
        nlp_status, nlp_quality = analyze_nlp_description(issue)

        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        started_at = created_at + pd.Timedelta(days=1)
        
        task_base = {
            "id": f"#{issue['number']}",
            "title": issue['title'],
            "sp": sp,
            "nlpStatus": nlp_status,
            "dateOpen": created_at.strftime("%d/%m/%Y"),
            "assignee": issue['assignee']['login'] if issue['assignee'] else None
        }

        if issue['state'] == 'closed' and issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            lead_time = (closed_at - created_at).total_seconds() / (24 * 3600)
            cycle_time = max((closed_at - started_at).total_seconds() / (24 * 3600), 0.1)
            
            ai_risk = "Low"
            if risk_model:
                try:
                    prediction = risk_model.predict([[cycle_time, sp, random.randint(0, 3)]])
                    if prediction[0] == 1: ai_risk = "High"
                except: pass

            member_info = issue.get('assignee') or issue.get('user')
            if member_info:
                login = member_info.get('login', 'Unknown')
                avatar = member_info.get('avatar_url', '')
                if login not in members_data:
                    members_data[login] = {"name": login, "avatar": avatar, "sp": 0, "tasks": 0}
                members_data[login]["sp"] += sp
                members_data[login]["tasks"] += 1

            task_detail = {
                "id": f"#{issue['number']}", "title": issue['title'], "sp": sp,
                "nlpStatus": nlp_status, "leadTime": lead_time, "cycleTime": cycle_time,
                "aiRisk": ai_risk, "dateClose": closed_at.strftime("%d/%m/%Y")
            }
            tasks.append(task_detail)
            task_base.update(task_detail)
            kanban["done"].append(task_base)
        else:
            if task_base["assignee"]: kanban["inProgress"].append(task_base)
            else: kanban["todo"].append(task_base)

    df = pd.DataFrame(tasks) if tasks else pd.DataFrame()
    total_velocity = int(df['sp'].sum()) if not df.empty else 0
    avg_cycle = float(df['cycleTime'].mean()) if not df.empty else 0
    avg_lead = float(df['leadTime'].mean()) if not df.empty else 0
    
    productivity_data = calculate_team_productivity(issues, start_project_date)
    burndown_data = calculate_burndown_data(issues, start_project_date)
    
    high_risk_tasks = df[df['aiRisk'] == 'High'].shape[0] if not df.empty else 0
    sprint_health = "CO RUI RO" if not df.empty and (high_risk_tasks / len(df)) > 0.3 else "AN TOAN"
    
    available_sprints = sorted(list(set(item['sprint'] for item in burndown_data)), key=lambda x: int(x.split()[1]))

    return {
        "velocity": total_velocity,
        "avgCycleTime": round(avg_cycle, 2),
        "avgLeadTime": round(avg_lead, 2),
        "teamProductivity": productivity_data["teamProductivity"],
        "tasksPerDay": productivity_data["tasksPerDay"],
        "burndownData": burndown_data,
        "availableSprints": available_sprints,
        "sprintHealth": sprint_health,
        "tasks": tasks,
        "kanban": kanban,
        "memberPerformance": list(members_data.values())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)