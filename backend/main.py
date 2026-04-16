from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import pandas as pd
import requests
from datetime import datetime
import joblib

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

@app.get("/api/metrics")
async def get_agile_metrics():
    """Endpoint lấy dữ liệu từ GitHub và tính toán chỉ số (Yêu cầu Tuần 3)"""
    headers = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/issues?state=all&per_page=100"
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Lỗi kết nối GitHub")

    issues = response.json()
    processed = []
    for issue in issues:
        if 'pull_request' in issue: continue
        
        # Tính toán Lead Time & Cycle Time [cite: 298-301]
        created_at = datetime.strptime(issue['created_at'], "%Y-%m-%dT%H:%M:%SZ")
        closed_at = issue['closed_at']
        if closed_at:
            closed_at = datetime.strptime(closed_at, "%Y-%m-%dT%H:%M:%SZ")
            lead_time = (closed_at - created_at).total_seconds() / (24 * 3600)
            
            # Trả về dữ liệu JSON cho React
            processed.append({
                "id": issue['number'],
                "title": issue['title'],
                "lead_time": round(lead_time, 2),
                "status": issue['state']
            })

    return {"tasks": processed}

@app.post("/api/predict")
async def predict_risk(cycle_time: float, story_points: int, bug_count: int):
    """Endpoint dự báo rủi ro bằng AI (Yêu cầu Tuần 4)"""
    try:
        # Load mô não AI đã huấn luyện [cite: 113-114, 304]
        model = joblib.load("models/sprint_risk_model.pkl")
        
        # Dự đoán rủi ro trễ hạn [cite: 6832-6833]
        prediction = model.predict([[cycle_time, story_points, bug_count]])
        risk_level = "High" if prediction[0] == 1 else "Low"
        
        return {"risk_prediction": risk_level}
    except Exception as e:
        return {"error": "Chưa có mô hình AI hoặc dữ liệu không hợp lệ"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)