from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import requests
from datetime import datetime
import joblib
import random

app = FastAPI(title="Agile Metrics AI API")

# Cho phép React kết nối tới API (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CẤU HÌNH ---
OWNER = "bmad-code-org"
REPO = "BMAD-METHOD"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

# TẢI MÔ HÌNH AI (Chỉ tải 1 lần lúc bật server để chạy cho nhanh)
try:
    risk_model = joblib.load("models/sprint_risk_model.pkl")
    print("✅ Đã tải thành công mô hình AI!")
except:
    risk_model = None
    print("⚠️ Cảnh báo: Không tìm thấy file models/sprint_risk_model.pkl. Hãy đảm bảo Thành viên B đã train mô hình.")

@app.get("/api/metrics")
async def get_agile_metrics():
    """Endpoint lấy dữ liệu GitHub, tính toán chỉ số & dùng AI dự báo rủi ro"""
    headers = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/issues?state=all&per_page=100"
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return {"error": "Lỗi kết nối GitHub API"}

    issues = response.json()
    tasks = []
    
    for issue in issues:
        if 'pull_request' in issue: continue
        
        # 1. Trích xuất Story Points
        sp = 0
        for label in issue.get('labels', []):
            if label['name'].startswith('SP:'):
                try: sp = int(label['name'].split(':')[1].strip())
                except: pass

        # 2. Tính toán Lead Time & Cycle Time
        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        started_at = created_at + pd.Timedelta(days=1) # Giả lập ngày bắt đầu
        
        if issue['state'] == 'closed' and issue['closed_at']:
            closed_at = datetime.strptime(issue['closed_at'], "%Y-%m-%dT%H:%M:%SZ")
            lead_time = (closed_at - created_at).total_seconds() / (24 * 3600)
            cycle_time = max((closed_at - started_at).total_seconds() / (24 * 3600), 0.1)
            
            # 3. Cho AI dự báo rủi ro TRỰC TIẾP cho từng task
            bug_count = random.randint(0, 3) # Giả lập số bug
            ai_risk = "Low"
            if risk_model:
                # Đưa thông số vào AI (Cycle Time, Story Points, Bug)
                prediction = risk_model.predict([[cycle_time, sp, bug_count]])
                if prediction[0] == 1:  # 1 nghĩa là AI dự báo sẽ trễ/rủi ro cao
                    ai_risk = "High"

            # Đóng gói dữ liệu chuẩn bị gửi cho React
            tasks.append({
                "id": f"#{issue['number']}",
                "title": issue['title'],
                "sp": sp,
                "leadTime": lead_time,
                "cycleTime": cycle_time,
                "aiRisk": ai_risk
            })

    if not tasks:
        return {"error": "Chưa có task hoàn thành"}

    # 4. Tính toán tổng hợp cho 4 Thẻ (Cards) trên cùng Dashboard
    df = pd.DataFrame(tasks)
    total_velocity = int(df['sp'].sum())
    avg_cycle = float(df['cycleTime'].mean())
    avg_lead = float(df['leadTime'].mean())
    
    # Tính "Sức khỏe Sprint": Nếu quá 30% task bị AI báo High Risk -> CẢNH BÁO
    high_risk_tasks = df[df['aiRisk'] == 'High'].shape[0]
    sprint_health = "CÓ RỦI RO" if (high_risk_tasks / len(df)) > 0.3 else "AN TOÀN"

    # Trả về cục JSON khớp 100% với giao diện React
    return {
        "velocity": total_velocity,
        "avgCycleTime": round(avg_cycle, 2),
        "avgLeadTime": round(avg_lead, 2),
        "sprintHealth": sprint_health,
        "tasks": tasks
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)