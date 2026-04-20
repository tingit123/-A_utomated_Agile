import React, { useState } from 'react';
import './Dashboard.css';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // GIỮ NGUYÊN 100% STATE TỪ CODE CỦA BẠN
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

  // GIỮ NGUYÊN 100% LOGIC GỌI API CỦA BẠN
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
    <div className="app-layout">

      {/* SIDEBAR BÊN TRÁI - GIAO DIỆN JIRA */}
      <aside className="sidebar">
        <div className="sidebar-logo">🚀 Agile<span>Pro</span></div>
        <ul className="sidebar-menu">
          <li className="active">📊 Dashboard Tổng Hợp</li>
          <li>📉 Biểu đồ Burndown</li>
          <li>📈 Năng suất Team</li>
          <li>📋 Chi tiết Nhiệm vụ</li>
        </ul>
      </aside>

      {/* NỘI DUNG CHÍNH BÊN PHẢI */}
      <main className="main-content">

        {/* THANH TÌM KIẾM TRÊN CÙNG (TOPBAR) */}
        <header className="topbar">
          <input
            className="repo-input"
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Dán link GitHub vào đây (VD: https://github.com/facebook/react)..."
          />
          <button className="btn-fetch" onClick={handleFetchMetrics} disabled={loading}>
            {loading ? "Đang tính toán..." : "Phân tích số liệu"}
          </button>
        </header>

        {/* KHU VỰC HIỂN THỊ DỮ LIỆU */}
        <div className="board-container">
          <h2 className="project-title">
            Báo cáo Agile: {repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Chưa có dự án'}
          </h2>

          {error && <div className="error-msg">⚠️ {error}</div>}

          {/* 5 Ô CHỈ SỐ NHANH (STAT PILLS) */}
          <div className="quick-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
            <div className="stat-pill">
              <span>💪 VẬN TỐC (SP)</span>
              <strong>{metrics.velocity}</strong>
            </div>
            <div className="stat-pill">
              <span>⏱️ CYCLE TIME</span>
              <strong>{metrics.avgCycleTime} ngày</strong>
            </div>
            <div className="stat-pill">
              <span>⌛ LEAD TIME</span>
              <strong>{metrics.avgLeadTime} ngày</strong>
            </div>
            <div className="stat-pill">
              <span>🚀 TEAM PRODUCTIVITY</span>
              <strong>{metrics.teamProductivity} tasks/ngày</strong>
            </div>
            <div className="stat-pill" style={{ border: `2px solid ${metrics.sprintHealth === "AN TOÀN" ? '#10B981' : '#EF4444'}` }}>
              <span>🤖 SỨC KHỎE (AI)</span>
              <strong style={{ color: metrics.sprintHealth === "AN TOÀN" ? '#10B981' : '#EF4444' }}>
                {metrics.sprintHealth}
              </strong>
            </div>
          </div>

          {/* KHU VỰC BIỂU ĐỒ (BURNDOWN & BAR CHART) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>

            {/* BURNDOWN CHART */}
            {metrics.burndownData.length > 0 && (
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '20px' }}>📉 BIỂU ĐỒ BURNDOWN</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={metrics.burndownData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="tasksRemaining" name="Tasks Còn Lại" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="tasksClosed" name="Tasks Đóng/Ngày" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* TEAM PRODUCTIVITY CHART */}
            {metrics.tasksPerDay.length > 0 && (
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginBottom: '20px' }}>📈 NĂNG SUẤT HÀNG NGÀY</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={metrics.tasksPerDay} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="completed" name="Tasks Hoàn Thành" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* KHU VỰC CÁC BẢNG DỮ LIỆU */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginBottom: '40px' }}>

            {/* BẢNG NĂNG SUẤT */}
            {metrics.tasksPerDay.length > 0 && (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontWeight: '800', color: '#0F172A' }}>📋 CHI TIẾT NĂNG SUẤT</div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <tr>
                        <th style={{ padding: '12px 20px', color: '#64748B', fontSize: '13px' }}>📅 Ngày</th>
                        <th style={{ padding: '12px 20px', color: '#64748B', fontSize: '13px' }}>✅ Hoàn thành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.tasksPerDay.map((day, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 20px', fontSize: '14px' }}>{day.date}</td>
                          <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 'bold', color: '#3B82F6' }}>{day.completed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BẢNG BURNDOWN */}
            {metrics.burndownData.length > 0 && (
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontWeight: '800', color: '#0F172A', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📊 DỮ LIỆU BURNDOWN</span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 'normal' }}>ℹ️ 14 ngày gần nhất</span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <tr>
                        <th style={{ padding: '12px 20px', color: '#64748B', fontSize: '13px' }}>📅 Ngày</th>
                        <th style={{ padding: '12px 20px', color: '#64748B', fontSize: '13px' }}>📊 Còn lại</th>
                        <th style={{ padding: '12px 20px', color: '#64748B', fontSize: '13px' }}>✅ Đóng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.burndownData.slice(-14).map((day, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 20px', fontSize: '14px' }}>{day.date}</td>
                          <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 'bold', color: '#EF4444' }}>{day.tasksRemaining}</td>
                          <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 'bold', color: '#10B981' }}>{day.tasksClosed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* BẢNG CHI TIẾT TASKS (DƯỚI CÙNG) */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontWeight: '800', color: '#0F172A' }}>🔍 CHI TIẾT TỪNG TASK & DỰ BÁO AI</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#FFFFFF' }}>
                <tr>
                  <th style={{ padding: '16px 20px', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Mã Task</th>
                  <th style={{ padding: '16px 20px', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Tên Task</th>
                  <th style={{ padding: '16px 20px', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Story Points</th>
                  <th style={{ padding: '16px 20px', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Lead Time</th>
                  <th style={{ padding: '16px 20px', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Cycle Time</th>
                  <th style={{ padding: '16px 20px', color: '#64748B', fontSize: '12px', textTransform: 'uppercase' }}>Dự báo AI</th>
                </tr>
              </thead>
              <tbody>
                {metrics.tasks.length > 0 ? (
                  metrics.tasks.map((task, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#3B82F6', fontSize: '14px' }}>{task.id}</td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#1E293B', fontWeight: '500' }}>{task.title}</td>
                      <td style={{ padding: '16px 20px', fontSize: '14px' }}>
                        <span style={{ background: '#F1F5F9', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', color: '#475569' }}>{task.sp} SP</span>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#64748B' }}>{task.leadTime?.toFixed(2)} d</td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#64748B' }}>{task.cycleTime?.toFixed(2)} d</td>
                      <td style={{ padding: '16px 20px' }}>
                        {task.aiRisk === 'High' ? (
                          <span style={{ background: '#FEE2E2', color: '#EF4444', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '12px' }}>🔴 Nguy cơ trễ</span>
                        ) : (
                          <span style={{ background: '#DCFCE7', color: '#10B981', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '12px' }}>🟢 An toàn</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontWeight: '500' }}>
                      {loading ? "Đang xử lý dữ liệu từ GitHub..." : "Chưa có dữ liệu. Vui lòng kết nối dự án để phân tích."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;