import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  // Khởi tạo state rỗng ban đầu chờ dữ liệu từ Python bơm vào
  const [metrics, setMetrics] = useState({
    velocity: 0,
    avgCycleTime: 0,
    avgLeadTime: 0,
    sprintHealth: "Đang tải...",
    tasks: []
  });

  // BƯỚC 1: KẾT NỐI API BACKEND
useEffect(() => {
    // 1. Gọi người bồi bàn (fetch) đến địa chỉ của nhà bếp Python
    fetch('http://localhost:8000/api/metrics')
      .then(res => {
        if (!res.ok) throw new Error("Lỗi mạng");
        return res.json(); // Nhận cục dữ liệu JSON
      })
      .then(data => {
        // 2. Nếu lấy thành công, đổ toàn bộ số liệu THẬT vào giao diện
        if(data.error) {
           console.error("Lỗi từ Backend:", data.error);
        } else {
           setMetrics(data); 
        }
      })
      .catch(err => {
        console.error("Lỗi gọi API:", err);
        // Hiển thị tạm chữ LỖI nếu chưa bật file Python
        setMetrics(prev => ({ ...prev, sprintHealth: "LỖI KẾT NỐI API" }));
      });
  }, []);

  return (
    <div className="container">
      <h1>BÁO CÁO AGILE TỔNG HỢP (KÈM AI)</h1>

      {/* BƯỚC 2: CẬP NHẬT THẺ THỐNG KÊ (THÊM SỨC KHỎE SPRINT) */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>VẬN TỐC</h3>
          <p>{metrics.velocity} SP</p>
        </div>
        <div className="stat-card">
          <h3>CYCLE TIME AVG</h3>
          <p>{metrics.avgCycleTime} ngày</p>
        </div>
        <div className="stat-card">
          <h3>LEAD TIME AVG</h3>
          <p>{metrics.avgLeadTime} ngày</p>
        </div>
        <div className="stat-card" style={{ backgroundColor: metrics.sprintHealth === "CÓ RỦI RO" ? '#ffeeba' : '#d4edda' }}>
          <h3>SỨC KHỎE SPRINT (AI)</h3>
          <p style={{ color: metrics.sprintHealth === "CÓ RỦI RO" ? '#dc3545' : '#28a745' }}>
            {metrics.sprintHealth}
          </p>
        </div>
      </div>

      {/* CẬP NHẬT BẢNG CHI TIẾT (THÊM CỘT AI CẢNH BÁO) */}
      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Mã Task</th>
              <th>Tên Task</th>
              <th>Story Points</th>
              <th>Lead Time</th>
              <th>Cycle Time</th>
              <th>AI Dự Báo (Trễ hạn)</th>
            </tr>
          </thead>
          <tbody>
            {metrics.tasks.map((task, index) => (
              <tr key={index}>
                <td>{task.id}</td>
                <td>{task.title}</td>
                <td>{task.sp}</td>
                <td>{task.leadTime.toFixed(2)}</td>
                <td>{task.cycleTime.toFixed(2)}</td>
                <td>
                  {/* Nếu Risk là High thì hiện cục đỏ, Low thì hiện cục xanh */}
                  {task.aiRisk === 'High' ? (
                    <span style={{ background: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                      🔴 Nguy cơ trễ
                    </span>
                  ) : (
                    <span style={{ background: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                      🟢 An toàn
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;