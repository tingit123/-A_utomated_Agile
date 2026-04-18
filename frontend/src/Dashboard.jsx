import React, { useState } from 'react';
import './Dashboard.css';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [metrics, setMetrics] = useState({
    velocity: 0,
    avgCycleTime: 0,
    avgLeadTime: 0,
    teamProductivity: 0,
    burndownData: [],
    tasksPerDay: [],
    sprintHealth: "CHƯA CÓ DỮ LIỆU",
    tasks: []
  });

  const handleFetchMetrics = async () => {
    if (!repoUrl) {
      setError("Vui lòng dán link GitHub vào ô trống.");
      return;
    }

    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      setError("Link GitHub không hợp lệ. Định dạng đúng: https://github.com/owner/repo");
      return;
    }

    const owner = match[1];
    const repo = match[2].replace('.git', '');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/metrics/${owner}/${repo}`);
      if (!response.ok) {
        throw new Error("Lỗi kết nối! Kiểm tra lại Backend Python hoặc Token GitHub.");
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
      setMetrics({
        velocity: 0, avgCycleTime: 0, avgLeadTime: 0, teamProductivity: 0,
        burndownData: [], tasksPerDay: [], sprintHealth: "LỖI", tasks: []
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>🎯 BÁO CÁO AGILE TỰ ĐỘNG (KÈM AI)</h1>

      {/* THANH NHẬP LINK GITHUB */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="Dán link GitHub vào đây (VD: https://github.com/facebook/react)"
          style={{ width: '450px', padding: '10px 15px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '15px' }}
        />
        <button
          onClick={handleFetchMetrics}
          disabled={loading}
          style={{
            padding: '10px 20px', backgroundColor: loading ? '#6c757d' : '#007bff',
            color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          {loading ? "Đang tính toán..." : "Phân tích số liệu"}
        </button>
      </div>

      {/* Hiển thị lỗi nếu có */}
      {error && <div style={{ color: '#dc3545', textAlign: 'center', marginBottom: '20px', fontWeight: '500' }}>⚠️ {error}</div>}

      {/* ========== CÁC THẺ CHỈ SỐ TỔNG HỢP (STATS CARDS) ========== */}
      <h2 style={{ textAlign: 'left', marginTop: '30px', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
        📊 Chỉ Số Agile (Week 3 - Measurement Model)
      </h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>💪 VẬN TỐC</h3>
          <p>{metrics.velocity} SP</p>
          <small style={{ color: '#666', marginTop: '8px' }}>Story Points/Sprint</small>
        </div>
        <div className="stat-card">
          <h3>⏱️ CYCLE TIME</h3>
          <p>{metrics.avgCycleTime} ngày</p>
          <small style={{ color: '#666', marginTop: '8px' }}>Trung bình (ngày)</small>
        </div>
        <div className="stat-card">
          <h3>⌛ LEAD TIME</h3>
          <p>{metrics.avgLeadTime} ngày</p>
          <small style={{ color: '#666', marginTop: '8px' }}>Trung bình (ngày)</small>
        </div>
        <div className="stat-card">
          <h3>🚀 TEAM PRODUCTIVITY</h3>
          <p>{metrics.teamProductivity} tasks/ngày</p>
          <small style={{ color: '#666', marginTop: '8px' }}>Tasks per Day</small>
        </div>
        <div className="stat-card" style={{ backgroundColor: metrics.sprintHealth === "CÓ RỦI RO" ? '#ffeeba' : '#d4edda' }}>
          <h3>🤖 SỨC KHỎE SPRINT (AI)</h3>
          <p style={{ color: metrics.sprintHealth === "CÓ RỦI RO" ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
            {metrics.sprintHealth}
          </p>
          <small style={{ color: '#666', marginTop: '8px' }}>AI Prediction</small>
        </div>
      </div>

      {/* ========== BURNDOWN CHART ========== */}
      {metrics.burndownData.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ textAlign: 'left', marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            📉 Biểu Đồ Burndown (Sprint Progress)
          </h2>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={metrics.burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: 'Tasks Remaining', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => value} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="tasksRemaining" 
                  stroke="#dc3545" 
                  strokeWidth={2}
                  name="📊 Tasks Còn Lại"
                  dot={{ fill: '#dc3545', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tasksClosed" 
                  stroke="#28a745" 
                  strokeWidth={2}
                  name="✅ Tasks Đóng/Ngày"
                  dot={{ fill: '#28a745', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ========== TEAM PRODUCTIVITY CHART ========== */}
      {metrics.tasksPerDay.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ textAlign: 'left', marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
            📈 Năng Suất Hàng Ngày (Daily Completion)
          </h2>
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.tasksPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: 'Tasks Completed', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="completed" 
                  fill="#007bff"
                  name="🎯 Tasks Hoàn Thành"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ========== TASKS PER DAY TABLE ========== */}
      {metrics.tasksPerDay.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ textAlign: 'left', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
            📋 Chi Tiết Năng Suất Hàng Ngày
          </h2>
          <table>
            <thead>
              <tr>
                <th>📅 Ngày</th>
                <th>✅ Tasks Hoàn Thành</th>
              </tr>
            </thead>
            <tbody>
              {metrics.tasksPerDay.map((day, idx) => (
                <tr key={idx}>
                  <td>{day.date}</td>
                  <td style={{ fontWeight: 'bold', color: '#007bff' }}>{day.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== BURNDOWN DATA TABLE ========== */}
      {metrics.burndownData.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ textAlign: 'left', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
            📊 Dữ Liệu Burndown (Sprint Progress Details)
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>📅 Ngày</th>
                  <th>📊 Tasks Còn Lại</th>
                  <th>✅ Tasks Đóng Trong Ngày</th>
                </tr>
              </thead>
              <tbody>
                {metrics.burndownData.slice(-14).map((day, idx) => (
                  <tr key={idx}>
                    <td>{day.date}</td>
                    <td style={{ fontWeight: 'bold', color: '#dc3545' }}>{day.tasksRemaining}</td>
                    <td style={{ fontWeight: 'bold', color: '#28a745' }}>{day.tasksClosed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <small style={{ color: '#666', marginTop: '10px', display: 'block' }}>
            ℹ️ Hiển thị 14 ngày gần nhất
          </small>
        </div>
      )}

      {/* ========== BẢNG CHI TIẾT TASKS ========== */}
      <div style={{ marginTop: '30px' }}>
        <h2 style={{ textAlign: 'left', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>
          🔍 Chi Tiết Từng Task (kèm AI Risk Prediction)
        </h2>
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Mã Task</th>
                <th>Tên Task</th>
                <th>Story Points</th>
                <th>Lead Time (Ngày)</th>
                <th>Cycle Time (Ngày)</th>
                <th>AI Dự Báo</th>
              </tr>
            </thead>
            <tbody>
              {metrics.tasks.length > 0 ? (
                metrics.tasks.map((task, index) => (
                  <tr key={index}>
                    <td>{task.id}</td>
                    <td>{task.title}</td>
                    <td>{task.sp}</td>
                    <td>{task.leadTime?.toFixed(2)}</td>
                    <td>{task.cycleTime?.toFixed(2)}</td>
                    <td>
                      {task.aiRisk === 'High' ? (
                        <span style={{ color: '#dc3545', fontWeight: 'bold' }}>🔴 Nguy cơ trễ</span>
                      ) : (
                        <span style={{ color: '#28a745', fontWeight: 'bold' }}>🟢 An toàn</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                    {loading ? "Đang xử lý dữ liệu từ GitHub..." : "Chưa có dữ liệu. Vui lòng dán link dự án để bắt đầu đo lường."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== FOOTER INFO ========== */}
      <div style={{ marginTop: '40px', marginBottom: '40px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px', textAlign: 'center', color: '#666' }}>
        <small>
          ✅ <strong>Week 3 + Visualization:</strong> Velocity | Cycle Time | Lead Time | Team Productivity | Burndown Chart | Daily Tasks Chart | AI Risk Prediction
        </small>
      </div>
    </div>
  );
};

export default Dashboard;