import React, { useState } from 'react';
import './Dashboard.css';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const parseTask = (title) => {
  const match = title.match(/^\[(.*?)\]\s*(.*)/);
  if (match) {
    const tag = match[1].toUpperCase();
    let bg = '#EAE6FF', color = '#403294';
    if (tag.includes('BUG')) { bg = '#FEE2E2'; color = '#EF4444'; }
    else if (tag.includes('DOC') || tag.includes('CHORE')) { bg = '#E0F2FE'; color = '#0284C7'; }
    else if (tag.includes('FEAT') || tag.includes('ENHANCE')) { bg = '#DCFCE7'; color = '#16A34A'; }
    return { tag, cleanTitle: match[2], bg, color };
  }
  return { tag: 'TASK', cleanTitle: title, bg: '#FEF9C3', color: '#CA8A04' };
};

const Dashboard = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Giới hạn hiển thị ban đầu
  const [limits, setLimits] = useState({ todo: 10, inProgress: 10, done: 10, table: 15 });

  const [metrics, setMetrics] = useState({
    velocity: 0, avgCycleTime: 0, avgLeadTime: 0, teamProductivity: 0, sprintHealth: "CHƯA CÓ DỮ LIỆU",
    burndownData: [], tasksPerDay: [], tasks: [],
    kanban: { todo: [], inProgress: [], done: [] }
  });

  const handleFetchMetrics = async () => {
    if (!repoUrl) { setError("Vui lòng dán link GitHub."); return; }
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) { setError("Link sai định dạng!"); return; }

    const owner = match[1];
    const repo = match[2].replace('.git', '');

    setLoading(true); setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/metrics/${owner}/${repo}`);
      if (!response.ok) throw new Error("Lỗi kết nối Backend Python.");
      const data = await response.json();
      setMetrics(data);
      // Reset lại số lượng hiển thị khi load dự án mới
      setLimits({ todo: 10, inProgress: 10, done: 10, table: 15 });
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const TaskCard = ({ task }) => {
    const { tag, cleanTitle, bg, color } = parseTask(task.title);
    const avatarUrl = task.assignee
      ? `https://ui-avatars.com/api/?name=${task.assignee}&background=random&color=fff&size=24`
      : 'https://ui-avatars.com/api/?name=Unassigned&background=E2E8F0&color=64748B&size=24';

    return (
      <div className="task-card">
        <span className="task-tag" style={{ backgroundColor: bg, color: color }}>{tag}</span>
        <p className="task-title">{cleanTitle}</p>

        {/* HIỂN THỊ NLP */}
        <div style={{ marginTop: '6px', marginBottom: '10px', fontSize: '12px', fontWeight: '600', color: (task.nlpStatus?.includes('mơ hồ') || task.nlpStatus?.includes('ngắn') || task.nlpStatus?.includes('Trống')) ? '#EF4444' : '#10B981' }}>
          🤖 AI NLP: {task.nlpStatus || "Đang phân tích..."}
        </div>

        <div className="task-footer">
          <span className="task-id">{task.id}</span>
          <div className="task-meta">
            {task.sp > 0 && <span className="story-point">{task.sp} SP</span>}
            <img src={avatarUrl} alt="Assignee" className="assignee-avatar" title={task.assignee || 'Chưa ai nhận'} />
          </div>
        </div>
      </div>
    );
  };

  const defaultBurndown = [{ date: 'Chưa kết nối', tasksRemaining: 0, tasksClosed: 0 }];
  const defaultTasksPerDay = [{ date: 'Chưa kết nối', completed: 0 }];

  const chartBurndownData = metrics.burndownData.length > 0 ? metrics.burndownData : defaultBurndown;
  const chartTasksPerDayData = metrics.tasksPerDay.length > 0 ? metrics.tasksPerDay : defaultTasksPerDay;

  return (
    <div className="app-layout">
      {/* SIDEBAR TĨNH */}
      <aside className="sidebar">
        <div className="sidebar-logo">🚀 Agile<span>Pro</span></div>
        <ul className="sidebar-menu">
          <li className="active">📊 Dashboard Tổng Hợp</li>
        </ul>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <input
            className="repo-input" type="text"
            value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Dán link GitHub (VD: https://github.com/bmad-code-org/BMAD-METHOD)..."
          />
          <button className="btn-fetch" onClick={handleFetchMetrics} disabled={loading}>
            {loading ? "Đang xử lý (Chờ 5s)..." : "Kết nối Dữ liệu"}
          </button>
        </header>

        <div className="board-container">
          <h2 className="project-title">Tiến độ dự án: {repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Chưa có dữ liệu'}</h2>

          {error && <div className="error-msg">⚠️ {error}</div>}

          {/* 1. QUICKS STATS */}
          <div className="quick-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="stat-pill"><span>VẬN TỐC (VELOCITY)</span><strong>{metrics.velocity} SP</strong></div>
            <div className="stat-pill"><span>CYCLE TIME TRUNG BÌNH</span><strong>{metrics.avgCycleTime} ngày</strong></div>
            <div className="stat-pill"><span>LEAD TIME TRUNG BÌNH</span><strong>{metrics.avgLeadTime} ngày</strong></div>
            <div className="stat-pill"><span>NĂNG SUẤT (PRODUCTIVITY)</span><strong>{metrics.teamProductivity} tasks/ngày</strong></div>
            <div className="stat-pill" style={{ border: `1px solid ${metrics.sprintHealth === "AN TOÀN" ? '#E2E8F0' : '#EF4444'}` }}>
              <span>DỰ BÁO TRÍ TUỆ NHÂN TẠO</span>
              <strong style={{ color: metrics.sprintHealth === "CHƯA CÓ DỮ LIỆU" ? '#EF4444' : (metrics.sprintHealth === "AN TOÀN" ? '#10B981' : '#EF4444') }}>
                {metrics.sprintHealth}
              </strong>
            </div>
          </div>

          {/* 2. KHU VỰC BIỂU ĐỒ NẰM NGANG NHAU TRÊN CÙNG MỘT TRANG */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            <div className="chart-box">
              <h3>📉 BIỂU ĐỒ BURNDOWN</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartBurndownData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" minTickGap={30} tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="tasksRemaining" name="Tasks Còn Lại" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="tasksClosed" name="Tasks Đã Đóng" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <h3>📈 NĂNG SUẤT HÀNG NGÀY</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartTasksPerDayData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" minTickGap={30} tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="completed" name="Task Hoàn Thành" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. BẢNG KANBAN 3 CỘT (CÓ NÚT TẢI THÊM) */}
          <div className="kanban-grid">
            <div className="kanban-col">
              <div className="col-header header-todo">CHƯA LÀM (TO DO) <span className="task-count">{metrics.kanban.todo.length}</span></div>
              {metrics.kanban.todo.slice(0, limits.todo).map(t => <TaskCard key={t.id} task={t} />)}
              {metrics.kanban.todo.length > limits.todo && <button className="btn-load-more" onClick={() => setLimits({ ...limits, todo: limits.todo + 30 })}>▼ Xem thêm 30 task</button>}
            </div>

            <div className="kanban-col">
              <div className="col-header header-progress">ĐANG LÀM (IN PROGRESS) <span className="task-count">{metrics.kanban.inProgress.length}</span></div>
              {metrics.kanban.inProgress.slice(0, limits.inProgress).map(t => <TaskCard key={t.id} task={t} />)}
              {metrics.kanban.inProgress.length > limits.inProgress && <button className="btn-load-more" onClick={() => setLimits({ ...limits, inProgress: limits.inProgress + 30 })}>▼ Xem thêm 30 task</button>}
            </div>

            <div className="kanban-col">
              <div className="col-header header-done">HOÀN THÀNH (DONE) <span className="task-count">{metrics.kanban.done.length}</span></div>
              {metrics.kanban.done.slice(0, limits.done).map(t => <TaskCard key={t.id} task={t} />)}
              {metrics.kanban.done.length > limits.done && <button className="btn-load-more" onClick={() => setLimits({ ...limits, done: limits.done + 30 })}>▼ Xem thêm 30 task</button>}
            </div>
          </div>

          {/* 4. BẢNG CHI TIẾT DỮ LIỆU */}
          <div className="chart-box" style={{ marginTop: '0px' }}>
            <h3 style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '0' }}>🔍 CHI TIẾT TỪNG TASK & DỰ BÁO AI</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#F8FAFC' }}>
                <tr>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px' }}>MÃ TASK</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px' }}>TÊN TASK</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px' }}>LEAD TIME</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px' }}>CYCLE TIME</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px' }}>CHẤT LƯỢNG MÔ TẢ (NLP)</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '12px' }}>DỰ BÁO AI ML</th>
                </tr>
              </thead>
              <tbody>
                {metrics.tasks.length > 0 ? (
                  metrics.tasks.slice(0, limits.table).map((task, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: '#3B82F6' }}>{task.id}</td>
                      <td style={{ padding: '16px', fontWeight: '500', color: '#1E293B' }}>{task.title}</td>
                      <td style={{ padding: '16px', color: '#64748B' }}>{task.leadTime?.toFixed(2)} d</td>
                      <td style={{ padding: '16px', color: '#64748B' }}>{task.cycleTime?.toFixed(2)} d</td>
                      <td style={{ padding: '16px', fontSize: '13px', fontWeight: '600', color: (task.nlpStatus?.includes('mơ hồ') || task.nlpStatus?.includes('ngắn') || task.nlpStatus?.includes('Trống')) ? '#EF4444' : '#10B981' }}>{task.nlpStatus || "Đang phân tích..."}</td>
                      <td style={{ padding: '16px' }}>
                        {task.aiRisk === 'High' ? <span style={{ background: '#FEE2E2', color: '#EF4444', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '12px' }}>🔴 Rủi ro</span>
                          : <span style={{ background: '#DCFCE7', color: '#10B981', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '12px' }}>🟢 An toàn</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Chưa có dữ liệu. Vui lòng kết nối dự án.</td></tr>
                )}
              </tbody>
            </table>
            {metrics.tasks.length > limits.table && (
              <button className="btn-load-more" style={{ marginTop: '16px' }} onClick={() => setLimits({ ...limits, table: limits.table + 30 })}>▼ Xem thêm 30 dòng</button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;