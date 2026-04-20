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

import os
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

try:
    risk_model = joblib.load("models/sprint_risk_model.pkl")
    print("✅ Đã tải thành công mô hình AI!")
except:
    risk_model = None
    print("⚠️ Cảnh báo: Không tìm thấy file models/sprint_risk_model.pkl.")


# ========== HÀM NÂNG CẤP: TÍNH BURNDOWN KÈM AUTO-GROUPING ==========
def calculate_burndown_data(issues):
    tasks_by_date = defaultdict(lambda: {"closed": 0, "created": 0})
    all_dates = set()
    
    for issue in issues:
        if 'pull_request' in issue: continue
        
        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        created_date = created_at.date()
        all_dates.add(created_date)
        tasks_by_date[created_date]["created"] += 1
        
        if issue['state'] == 'closed' and issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            closed_date = closed_at.date()
            all_dates.add(closed_date)
            tasks_by_date[closed_date]["closed"] += 1
    
    burndown = []
    if all_dates:
        min_date = min(all_dates)
        max_date = max(all_dates)
        total_days = (max_date - min_date).days
        
        # THUẬT TOÁN TỰ ĐỘNG CHIA GIAI ĐOẠN ĐỂ BIỂU ĐỒ LUÔN ĐẸP
        if total_days <= 40: step_days = 1          # Theo ngày
        elif total_days <= 120: step_days = 3       # 3 ngày/lần
        elif total_days <= 300: step_days = 7       # Theo Tuần
        elif total_days <= 1200: step_days = 30     # Theo Tháng
        else: step_days = 90                        # Theo Quý
        
        tasks_remaining = 0
        current_date = min_date
        
        while current_date <= max_date:
            period_created = 0
            period_closed = 0
            
            # Cộng dồn số task trong giai đoạn đó
            for i in range(step_days):
                check_date = current_date + timedelta(days=i)
                if check_date > max_date: break
                if check_date in all_dates:
                    period_created += tasks_by_date[check_date]["created"]
                    period_closed += tasks_by_date[check_date]["closed"]
            
            tasks_remaining += period_created
            tasks_remaining -= period_closed
            
            # Tạo nhãn đẹp cho trục X
            if step_days == 1 or step_days == 3:
                label = current_date.strftime("%d/%m/%Y")
            elif step_days == 7:
                label = f"Tuần {current_date.isocalendar()[1]}/{current_date.year}"
            else:
                label = current_date.strftime("Tháng %m/%Y")
            
            burndown.append({
                "date": label,
                "tasksRemaining": max(tasks_remaining, 0),
                "tasksClosed": period_closed
            })
            
            current_date += timedelta(days=step_days)
            
    return burndown


# ========== HÀM NÂNG CẤP: TÍNH NĂNG SUẤT KÈM AUTO-GROUPING ==========
def calculate_team_productivity(issues):
    tasks_per_day = defaultdict(int)
    all_dates = set()
    
    for issue in issues:
        if 'pull_request' in issue or issue['state'] != 'closed': continue
        if issue['closed_at']:
            closed_date = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ").date()
            tasks_per_day[closed_date] += 1
            all_dates.add(closed_date)
            
    if not all_dates:
        return {"teamProductivity": 0, "tasksPerDay": []}
        
    min_date = min(all_dates)
    max_date = max(all_dates)
    total_days = (max_date - min_date).days
    
    # Tương tự: Gom nhóm biểu đồ Năng suất
    if total_days <= 40: step_days = 1
    elif total_days <= 120: step_days = 3
    elif total_days <= 300: step_days = 7
    elif total_days <= 1200: step_days = 30
    else: step_days = 90
    
    tasks_per_period_list = []
    current_date = min_date
    total_completed = 0
    
    while current_date <= max_date:
        period_closed = 0
        for i in range(step_days):
            check_date = current_date + timedelta(days=i)
            if check_date > max_date: break
            period_closed += tasks_per_day[check_date]
        
        total_completed += period_closed
        
        if step_days == 1 or step_days == 3: label = current_date.strftime("%d/%m/%Y")
        elif step_days == 7: label = f"Tuần {current_date.isocalendar()[1]}/{current_date.year}"
        else: label = current_date.strftime("Tháng %m/%Y")
        
        tasks_per_period_list.append({
            "date": label,
            "completed": period_closed
        })
        current_date += timedelta(days=step_days)
        
    # Tính số lượng hoàn thành trung bình mỗi ngày (Để hiển thị ở thẻ Stats cho chuẩn)
    avg_productivity = total_completed / max(total_days, 1)
    
    return {
        "teamProductivity": round(avg_productivity, 2),
        "tasksPerDay": tasks_per_period_list
    }


@app.get("/api/metrics/{owner}/{repo}")
async def get_agile_metrics(owner: str, repo: str):
    headers = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    
    issues = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=all&per_page=100&page={page}"
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            if page == 1: raise HTTPException(status_code=response.status_code, detail="Lỗi kết nối GitHub API")
            break
            
        batch = response.json()
        if not batch: break
            
        issues.extend(batch)
        page += 1
        time.sleep(0.2)

    tasks = []
    kanban = {"todo": [], "inProgress": [], "done": []}
    
    for issue in issues:
        if 'pull_request' in issue: continue
        
        sp = 0
        for label in issue.get('labels', []):
            if isinstance(label, dict) and label.get('name', '').startswith('SP:'):
                try: sp = int(label['name'].split(':')[1].strip())
                except: pass

        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        started_at = created_at + pd.Timedelta(days=1)
        
        task_base = {
            "id": f"#{issue['number']}",
            "title": issue['title'],
            "sp": sp,
            "dateOpen": created_at.strftime("%d/%m/%Y"),
            "assignee": issue['assignee']['login'] if issue['assignee'] else None
        }

        if issue['state'] == 'closed' and issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            lead_time = (closed_at - created_at).total_seconds() / (24 * 3600)
            cycle_time = max((closed_at - started_at).total_seconds() / (24 * 3600), 0.1)
            
            bug_count = random.randint(0, 3)
            ai_risk = "Low"
            if risk_model:
                prediction = risk_model.predict([[cycle_time, sp, bug_count]])
                if prediction[0] == 1: ai_risk = "High"

            task_detail = {
                "id": f"#{issue['number']}",
                "title": issue['title'],
                "sp": sp,
                "leadTime": lead_time,
                "cycleTime": cycle_time,
                "aiRisk": ai_risk,
                "dateClose": closed_at.strftime("%d/%m/%Y")
            }
            tasks.append(task_detail)
            task_base.update(task_detail)
            kanban["done"].append(task_base)
        else:
            if task_base["assignee"]: kanban["inProgress"].append(task_base)
            else: kanban["todo"].append(task_base)

    if not tasks:
        return {
            "velocity": 0, "avgCycleTime": 0, "avgLeadTime": 0, "teamProductivity": 0,
            "burndownData": [], "sprintHealth": "CHƯA CÓ DỮ LIỆU", "tasks": [], "kanban": kanban
        }

    df = pd.DataFrame(tasks)
    total_velocity = int(df['sp'].sum())
    avg_cycle = float(df['cycleTime'].mean())
    avg_lead = float(df['leadTime'].mean())
    
    productivity_data = calculate_team_productivity(issues)
    burndown_data = calculate_burndown_data(issues)
    
    high_risk_tasks = df[df['aiRisk'] == 'High'].shape[0]
    sprint_health = "CÓ RỦI RO" if (high_risk_tasks / len(df)) > 0.3 else "AN TOÀN"

    return {
        "velocity": total_velocity,
        "avgCycleTime": round(avg_cycle, 2),
        "avgLeadTime": round(avg_lead, 2),
        "teamProductivity": productivity_data["teamProductivity"],
        "tasksPerDay": productivity_data["tasksPerDay"],
        "burndownData": burndown_data,
        "sprintHealth": sprint_health,
        "tasks": tasks,
        "kanban": kanban
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)