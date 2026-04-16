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
    // Kịch bản 1: KHI BACKEND CHƯA CHẠY 
    // Mình tạm nạp dữ liệu này vào để bạn xem cái giao diện AI nó đẹp như thế nào trước nhé
    setMetrics({
      velocity: 45,
      avgCycleTime: 3.52,
      avgLeadTime: 4.65,
      sprintHealth: "CÓ RỦI RO", // Thêm chỉ số sức khỏe tổng thể
      tasks: [
        { id: '#2256', title: '[BUG] Crash with install', sp: 3, leadTime: 0.60, cycleTime: 0.10, aiRisk: 'Low' },
        { id: '#2249', title: '[DOCS]', sp: 2, leadTime: 1.32, cycleTime: 0.32, aiRisk: 'Low' },
        { id: '#2246', title: 'Change the language for LLM...', sp: 5, leadTime: 2.38, cycleTime: 1.38, aiRisk: 'Low' },
        { id: '#2239', title: '[BUG] when install bmad...', sp: 8, leadTime: 2.94, cycleTime: 4.94, aiRisk: 'High' },
        { id: '#2232', title: '[BUG] ships an invalid...', sp: 13, leadTime: 4.32, cycleTime: 5.32, aiRisk: 'High' }
      ]
    });

    /* // Kịch bản 2: KHI BACKEND PYTHON ĐÃ CHẠY (Thành viên C làm xong API)
    // Bạn xóa đoạn setMetrics giả ở trên đi, và bỏ // ở đoạn code dưới đây ra:
    
    fetch('http://localhost:8000/api/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
      })
      .catch(err => console.error("Lỗi gọi API:", err));
    */
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