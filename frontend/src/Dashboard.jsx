import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Import file CSS ở Bước 2

const Dashboard = () => {
  // Dữ liệu mẫu (Mock data) được trích xuất từ file result_dashboard.html của bạn
  const [metrics, setMetrics] = useState({
    velocity: 0,
    avgCycleTime: 3.52, // Điền số liệu trung bình tạm thời
    avgLeadTime: 4.65,
    tasks: [
      { id: '#2256', title: '[BUG] Crash with install', sp: 0, leadTime: 0.595764, cycleTime: 0.100000 },
      { id: '#2249', title: '[DOCS]', sp: 0, leadTime: 1.323738, cycleTime: 0.323738 },
      { id: '#2246', title: 'Change the language for LLM interaction...', sp: 0, leadTime: 2.384178, cycleTime: 1.384178 },
      { id: '#2239', title: '[BUG] when install bmad with npx...', sp: 0, leadTime: 2.942523, cycleTime: 1.942523 },
      { id: '#2232', title: '[BUG] bmad-module-builder ships an invalid...', sp: 0, leadTime: 4.322743, cycleTime: 3.322743 }
    ]
  });

  /* // GỢI Ý TUẦN 5: Sau này bạn sẽ dùng useEffect để gọi API từ Python thay vì dùng Mock Data
  useEffect(() => {
    fetch('http://localhost:8000/api/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data));
  }, []);
  */

  return (
    <div className="container">
      <h1>BÁO CÁO AGILE TUẦN 3</h1>

      {/* Hiển thị các thẻ chỉ số (Stats Grid) */}
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
      </div>

      {/* Bảng chi tiết Task */}
      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Mã Task</th>
              <th>Tên Task</th>
              <th>Story Points</th>
              <th>Lead Time (Ngày)</th>
              <th>Cycle Time (Ngày)</th>
            </tr>
          </thead>
          <tbody>
            {metrics.tasks.map((task, index) => (
              <tr key={index}>
                <td>{task.id}</td>
                <td>{task.title}</td>
                <td>{task.sp}</td>
                {/* Dùng toFixed(2) để làm tròn 2 chữ số thập phân cho đẹp */}
                <td>{task.leadTime.toFixed(2)}</td>
                <td>{task.cycleTime.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;