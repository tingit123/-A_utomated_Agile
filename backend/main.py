from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import pandas as pd
from datetime import datetime, timedelta
import joblib
import random
from collections import defaultdict

app = FastAPI(title="Agile Metrics AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# CẤU HÌNH TOKEN
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

# TẢI MÔ HÌNH AI (Chỉ tải 1 lần lúc bật server để chạy cho nhanh)
try:
    risk_model = joblib.load("models/sprint_risk_model.pkl")
    print("✅ Đã tải thành công mô hình AI!")
except:
    risk_model = None
    print("⚠️ Cảnh báo: Không tìm thấy file models/sprint_risk_model.pkl.")


# ========== HELPER FUNCTION: TÍNH BURNDOWN DATA ==========
def calculate_burndown_data(issues):
    """
    Tính Burndown Chart Data - tracking tasks theo từng ngày
    Output: [{"date": "2024-01-15", "tasksRemaining": 15, "tasksClosed": 5}, ...]
    """
    tasks_by_date = defaultdict(lambda: {"closed": 0, "created": 0})
    all_dates = set()
    
    for issue in issues:
        if 'pull_request' in issue:
            continue
        
        # Track created date
        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        created_date = created_at.date()
        all_dates.add(created_date)
        tasks_by_date[created_date]["created"] += 1
        
        # Track closed date
        if issue['state'] == 'closed' and issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            closed_date = closed_at.date()
            all_dates.add(closed_date)
            tasks_by_date[closed_date]["closed"] += 1
    
    # Tính cumulative tasks remaining
    burndown = []
    if all_dates:
        min_date = min(all_dates)
        max_date = max(all_dates)
        
        tasks_remaining = 0
        current_date = min_date
        
        while current_date <= max_date:
            if current_date in all_dates:
                tasks_remaining += tasks_by_date[current_date]["created"]
                tasks_remaining -= tasks_by_date[current_date]["closed"]
            
            burndown.append({
                "date": str(current_date),
                "tasksRemaining": max(tasks_remaining, 0),
                "tasksClosed": tasks_by_date[current_date]["closed"]
            })
            
            current_date += timedelta(days=1)
    
    return burndown


# ========== HELPER FUNCTION: TÍNH TEAM PRODUCTIVITY ==========
def calculate_team_productivity(issues):
    """
    Tính Team Productivity - tasks per day
    Output: {
        "teamProductivity": 2.5,  # trung bình tasks/day
        "tasksPerDay": [{"date": "2024-01-15", "completed": 3}, ...]
    }
    """
    tasks_per_day = defaultdict(int)
    
    for issue in issues:
        if 'pull_request' in issue or issue['state'] != 'closed':
            continue
        
        if issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            closed_date = closed_at.date()
            tasks_per_day[closed_date] += 1
    
    # Convert to sorted list
    tasks_per_day_list = [
        {"date": str(date), "completed": count}
        for date, count in sorted(tasks_per_day.items())
    ]
    
    # Tính trung bình
    if tasks_per_day_list:
        avg_productivity = sum(d["completed"] for d in tasks_per_day_list) / len(tasks_per_day_list)
    else:
        avg_productivity = 0
    
    return {
        "teamProductivity": round(avg_productivity, 2),
        "tasksPerDay": tasks_per_day_list
    }


@app.get("/api/metrics/{owner}/{repo}")
async def get_agile_metrics(owner: str, repo: str):
    """
    WEEK 3: Lấy dữ liệu động từ GitHub và tính đủ các chỉ số Agile
    
    Return:
    - velocity: tổng story points
    - avgCycleTime: trung bình cycle time
    - avgLeadTime: trung bình lead time
    - teamProductivity: tasks per day
    - burndownData: tracking tasks by date
    - sprintHealth: AI dự báo sức khỏe sprint
    - tasks: chi tiết từng task
    """
    headers = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=all&per_page=100"
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Lỗi kết nối GitHub API")

    issues = response.json()
    tasks = []
    
    for issue in issues:
        if 'pull_request' in issue: 
            continue
        
        # Trích xuất Story Points từ labels
        sp = 0
        for label in issue.get('labels', []):
            if isinstance(label, dict) and label.get('name', '').startswith('SP:'):
                try: sp = int(label['name'].split(':')[1].strip())
                except: pass

        # Tính toán Lead Time & Cycle Time (chỉ lấy closed issues)
        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        started_at = created_at + pd.Timedelta(days=1)
        
        if issue['state'] == 'closed' and issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            lead_time = (closed_at - created_at).total_seconds() / (24 * 3600)
            cycle_time = max((closed_at - started_at).total_seconds() / (24 * 3600), 0.1)
            
            # AI dự báo rủi ro
            bug_count = random.randint(0, 3)
            ai_risk = "Low"
            if risk_model:
                prediction = risk_model.predict([[cycle_time, sp, bug_count]])
                if prediction[0] == 1:
                    ai_risk = "High"

            tasks.append({
                "id": f"#{issue['number']}",
                "title": issue['title'],
                "sp": sp,
                "leadTime": lead_time,
                "cycleTime": cycle_time,
                "aiRisk": ai_risk
            })

    if not tasks:
        return {
            "velocity": 0,
            "avgCycleTime": 0,
            "avgLeadTime": 0,
            "teamProductivity": 0,
            "burndownData": [],
            "sprintHealth": "CHƯA CÓ DỮ LIỆU",
            "tasks": []
        }

    # ========== BƯỚC 1: Tính Velocity, Cycle Time, Lead Time ==========
    df = pd.DataFrame(tasks)
    total_velocity = int(df['sp'].sum())
    avg_cycle = float(df['cycleTime'].mean())
    avg_lead = float(df['leadTime'].mean())
    
    # ========== BƯỚC 2: Tính Team Productivity ==========
    productivity_data = calculate_team_productivity(issues)
    team_productivity = productivity_data["teamProductivity"]
    tasks_per_day = productivity_data["tasksPerDay"]
    
    # ========== BƯỚC 3: Tính Burndown Data ==========
    burndown_data = calculate_burndown_data(issues)
    
    # ========== BƯỚC 4: Tính Sprint Health (dựa AI) ==========
    high_risk_tasks = df[df['aiRisk'] == 'High'].shape[0]
    sprint_health = "CÓ RỦI RO" if (high_risk_tasks / len(df)) > 0.3 else "AN TOÀN"

    # ========== RETURN COMPLETE METRICS ==========
    return {
        "velocity": total_velocity,
        "avgCycleTime": round(avg_cycle, 2),
        "avgLeadTime": round(avg_lead, 2),
        "teamProductivity": team_productivity,
        "tasksPerDay": tasks_per_day,
        "burndownData": burndown_data,
        "sprintHealth": sprint_health,
        "tasks": tasks
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)