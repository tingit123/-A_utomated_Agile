import React, { useState, useMemo, useEffect, useRef } from 'react';
import './Dashboard.css';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const sparkData1 = [{ v: 10 }, { v: 20 }, { v: 15 }, { v: 30 }, { v: 25 }, { v: 40 }, { v: 60 }];
const sparkData2 = [{ v: 20 }, { v: 40 }, { v: 25 }, { v: 50 }, { v: 45 }, { v: 70 }, { v: 80 }];
const sparkData3 = [{ v: 30 }, { v: 50 }, { v: 35 }, { v: 60 }, { v: 40 }, { v: 80 }, { v: 90 }];
const sparkData4 = [{ v: 15 }, { v: 30 }, { v: 20 }, { v: 40 }, { v: 35 }, { v: 60 }, { v: 85 }];
const sparkData5 = [{ v: 50 }, { v: 40 }, { v: 60 }, { v: 45 }, { v: 55 }, { v: 40 }, { v: 50 }];

const Dashboard = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectedRepo, setConnectedRepo] = useState(null);

  const [selectedSprint, setSelectedSprint] = useState('All');
  const [leaderboardSort, setLeaderboardSort] = useState('sp');
  const [colorTheme, setColorTheme] = useState('light');
  const [limits, setLimits] = useState({ todo: 10, inProgress: 10, done: 10, table: 15 });

  const [metrics, setMetrics] = useState({
    velocity: 0, avgCycleTime: 0, avgLeadTime: 0, teamProductivity: 0, sprintHealth: "CHƯA CÓ DỮ LIỆU",
    burndownData: [], tasksPerDay: [], availableSprints: [], tasks: [], memberPerformance: [],
    projectDiagnosis: null,
    kanban: { todo: [], inProgress: [], done: [] }
  });

  const sortedMembers = useMemo(() => {
    let members = [...(metrics.memberPerformance || [])];
    if (members.length === 0) return [];
    members.sort((a, b) => b[leaderboardSort] - a[leaderboardSort]);
    const maxScore = members[0][leaderboardSort] || 1;
    return members.map((m, idx) => ({ ...m, rank: idx + 1, percent: (m[leaderboardSort] / maxScore) * 100 }));
  }, [metrics.memberPerformance, leaderboardSort]);

  // ==========================================
  // HỆ THỐNG NÃO KÉP (DUAL-BRAIN) CHO CHATBOT
  // ==========================================
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Chào Ting! Mình là AI Scrum Master. Mình đã được trang bị Não Kép chống sập, bạn có thể hỏi mình 1+1 hoặc bất kỳ số liệu nào của dự án!' }
  ]);
  const chatBodyRef = useRef(null);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatMessages, isAiTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput("");
    setIsAiTyping(true);

    const GEMINI_API_KEY = "AIzaSyAVSul8F8UeoQiWe-KvX5k7YHzl8CWuXpQ";

    // Tạo độ trễ giả lập AI đang suy nghĩ
    setTimeout(async () => {
      try {
        const topMember = sortedMembers.length > 0 ? sortedMembers[0].name : "Chưa có";
        const systemPrompt = `Bạn là AI Scrum Master. Dữ liệu: Velocity ${metrics.velocity}, Cycle Time ${metrics.avgCycleTime}, Rủi ro ${metrics.sprintHealth}. Trả lời ngắn gọn: "${userText}"`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        });

        if (!response.ok) throw new Error("API Google Lỗi");

        const data = await response.json();
        const aiReply = data.candidates[0].content.parts[0].text;
        setChatMessages(prev => [...prev, { sender: 'ai', text: aiReply }]);

      } catch (error) {
        // NẾU GOOGLE LỖI HOẶC SẬP -> KÍCH HOẠT BỘ NÃO OFFLINE NGAY LẬP TỨC
        let fallbackReply = "";
        const lowerText = userText.toLowerCase();

        // 1. Não Toán Học (Tính 1+1, 2*5...)
        const mathMatch = userText.match(/(\d+)\s*([+\-*/])\s*(\d+)/);
        if (mathMatch) {
          try {
            fallbackReply = `Kết quả của phép tính là: ${eval(mathMatch[0])} nhé!`;
          } catch {
            fallbackReply = "Phép tính này ngộ quá, máy tính của mình báo lỗi rồi.";
          }
        }
        // 2. Não Chào hỏi
        else if (lowerText.includes("chào") || lowerText.includes("alo") || lowerText.includes("hi") || lowerText.includes("ê")) {
          fallbackReply = "Chào Ting! Thức khuya cày đồ án vất vả quá. Bạn cần mình báo cáo tình hình dự án phần nào?";
        }
        // 3. Não Rủi ro
        else if (lowerText.includes("rủi ro") || lowerText.includes("fail") || lowerText.includes("khả thi")) {
          fallbackReply = `Hệ thống đánh giá dự án đang ở mức: **${metrics.sprintHealth}**. Với Cycle Time hiện tại là ${metrics.avgCycleTime} ngày, bạn nên đôn đốc team hoàn thành các task In Progress sớm nhé!`;
        }
        // 4. Não Thành viên
        else if (lowerText.includes("ai") || lowerText.includes("thành viên") || lowerText.includes("giỏi") || lowerText.includes("gánh")) {
          const top = sortedMembers.length > 0 ? sortedMembers[0].name : "Chưa có dữ liệu";
          fallbackReply = `Hiện tại **${top}** đang là người xuất sắc nhất, gánh team với điểm Story Points cao nhất đó.`;
        }
        // 5. Não Tiến độ
        else if (lowerText.includes("tiến độ") || lowerText.includes("vận tốc") || lowerText.includes("nhanh")) {
          fallbackReply = `Vận tốc team (Velocity) đang đạt ${metrics.velocity} SP. Trung bình team hoàn thành ${metrics.teamProductivity} task mỗi ngày.`;
        }
        // 6. Mặc định
        else {
          fallbackReply = "Dựa trên các chỉ số Agile, dự án đang chạy theo quy trình. Nếu cần chi tiết, bạn hãy hỏi cụ thể về Tiến độ, Thành viên hoặc Rủi ro nhé!";
        }

        setChatMessages(prev => [...prev, { sender: 'ai', text: fallbackReply }]);
      } finally {
        setIsAiTyping(false);
      }
    }, 800); // Trễ 0.8s để trông như AI thật đang gõ chữ
  };
  // ==========================================

  const handleFetchMetrics = async () => {
    if (!repoUrl && !connectedRepo) { setError("Vui lòng dán link GitHub."); return; }
    const urlToFetch = repoUrl || `https://github.com/${connectedRepo}`;
    const match = urlToFetch.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) { setError("Link sai định dạng!"); return; }

    setLoading(true); setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/metrics/${match[1]}/${match[2].replace('.git', '')}`);
      if (!response.ok) throw new Error("Lỗi kết nối Backend Python.");
      const data = await response.json();
      setMetrics(data);
      setConnectedRepo(`${match[1]}/${match[2].replace('.git', '')}`);
      setSelectedSprint('All');
      setLimits({ todo: 10, inProgress: 10, done: 10, table: 15 });
      setChatMessages([{ sender: 'ai', text: `Tuyệt vời! Đã tải xong ${match[2]}. Vận tốc team đang là ${data.velocity} SP. Bạn cứ hỏi thoải mái nhé!` }]);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const cycleTheme = () => {
    if (colorTheme === 'light') setColorTheme('blue');
    else if (colorTheme === 'blue') setColorTheme('green');
    else if (colorTheme === 'green') setColorTheme('dark');
    else setColorTheme('light');
  };
  const themeIcon = colorTheme === 'light' ? '☀️' : (colorTheme === 'blue' ? '🌊' : (colorTheme === 'green' ? '🌿' : '🌙'));
  const themeClass = colorTheme === 'dark' ? 'theme-dark' : (colorTheme === 'blue' ? 'theme-blue' : (colorTheme === 'green' ? 'theme-green' : ''));

  const filteredBurndown = useMemo(() => {
    let data = metrics.burndownData;
    if (data.length === 0) return [{ date: 'Chưa kết nối', tasksRemaining: 0, tasksClosed: 0 }];
    let finalData = [];
    if (selectedSprint !== 'All') {
      finalData = data.filter(d => d.sprint === selectedSprint);
    } else {
      const sprints = [...new Set(data.map(d => d.sprint))];
      const maxPoints = 12;
      if (sprints.length > maxPoints) {
        const chunkSize = Math.ceil(sprints.length / maxPoints);
        for (let i = 0; i < sprints.length; i += chunkSize) {
          const chunk = sprints.slice(i, i + chunkSize);
          const spData = data.filter(d => chunk.includes(d.sprint));
          if (spData.length > 0) finalData.push({ ...spData[spData.length - 1], date: `Sp ${chunk[0].split(' ')[1]}-${chunk[chunk.length - 1].split(' ')[1]}` });
        }
      } else {
        sprints.forEach(sp => {
          const spData = data.filter(d => d.sprint === sp);
          if (spData.length > 0) finalData.push({ ...spData[spData.length - 1], date: sp });
        });
      }
    }
    const startValue = metrics.burndownData[0]?.tasksRemaining || 0;
    const dropPerDay = startValue / (finalData.length > 1 ? finalData.length - 1 : 1);
    return finalData.map((d, index) => ({ ...d, idealLine: Math.max(0, Math.round(startValue - dropPerDay * index)) }));
  }, [metrics.burndownData, selectedSprint]);

  const filteredProductivity = useMemo(() => {
    if (metrics.tasksPerDay.length === 0) return [{ date: 'Chưa kết nối', completed: 0 }];
    if (selectedSprint !== 'All') return metrics.tasksPerDay.filter(d => d.sprint === selectedSprint);
    const sprints = [...new Set(metrics.tasksPerDay.map(d => d.sprint))];
    const maxPoints = 12;
    let finalData = [];
    if (sprints.length > maxPoints) {
      const chunkSize = Math.ceil(sprints.length / maxPoints);
      for (let i = 0; i < sprints.length; i += chunkSize) {
        const chunk = sprints.slice(i, i + chunkSize);
        const spData = metrics.tasksPerDay.filter(d => chunk.includes(d.sprint));
        finalData.push({ date: `Sp ${chunk[0].split(' ')[1]}...`, completed: spData.reduce((acc, curr) => acc + curr.completed, 0) });
      }
    } else {
      sprints.forEach(sp => finalData.push({ date: sp, completed: metrics.tasksPerDay.filter(d => d.sprint === sp).reduce((acc, curr) => acc + curr.completed, 0) }));
    }
    return finalData;
  }, [metrics.tasksPerDay, selectedSprint]);

  const TaskCard = ({ task }) => {
    const { tag, cleanTitle, bg, color } = parseTask(task.title);
    return (
      <div className="task-card">
        <span className="task-tag" style={{ backgroundColor: bg, color: color }}>{tag}</span>
        <p className="task-title">{cleanTitle}</p>
        <div style={{ fontSize: '12px', fontWeight: '700', color: (task.nlpStatus?.includes('⚠️')) ? '#EF4444' : '#10B981' }}>🤖 AI NLP: {task.nlpStatus || "Đang phân tích..."}</div>
        <div className="task-footer">
          <span className="task-id">{task.id}</span>
          <div className="task-meta">
            {task.sp > 0 && <span className="story-point">{task.sp} SP</span>}
            <img src={`https://ui-avatars.com/api/?name=${task.assignee || 'U'}&background=random`} alt="Avatar" className="assignee-avatar" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app-layout ${themeClass}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">🚀 Agile<span>Pro</span></div>
        <ul className="sidebar-menu">
          <li className="active">📊 <span>Tổng quan</span></li>
          <li>🎯 <span>Quản lý Sprint</span></li>
          <li>👥 <span>Năng suất Team</span></li>
        </ul>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            {!connectedRepo ? (
              <><input className="repo-input" type="text" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="Dán link GitHub..." />
                <button className="btn-fetch" onClick={handleFetchMetrics} disabled={loading}>{loading ? "..." : "Kết nối"}</button></>
            ) : (
              <><div className="connected-badge"><span className="status-dot"></span> {connectedRepo}</div>
                <button className="btn-sync" onClick={handleFetchMetrics} disabled={loading}>🔄</button></>
            )}
          </div>
          <div className="topbar-right">
            <button className="theme-toggle-btn" onClick={cycleTheme}>{themeIcon}</button>
          </div>
        </header>

        <div className="board-container">
          <div className="dashboard-header-row">
            <div><h2 className="project-title">Dashboard Tổng Hợp</h2></div>
            <div><select className="sprint-selector" value={selectedSprint} onChange={(e) => setSelectedSprint(e.target.value)}>
              <option value="All">Tất cả Sprint</option>
              {metrics.availableSprints?.map(s => <option key={s} value={s}>{s}</option>)}
            </select></div>
          </div>

          <div className="quick-stats">
            <div className="stat-pill"><div className="stat-header"><div className="stat-icon icon-blue">⚡</div><div className="stat-info"><span className="stat-title">VELOCITY</span><span className="stat-value">{metrics.velocity} SP</span></div></div><div className="stat-chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparkData1}><defs><linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colorTheme === 'green' ? '#22C55E' : '#3B82F6'} stopOpacity={0.3} /><stop offset="95%" stopColor={colorTheme === 'green' ? '#22C55E' : '#3B82F6'} stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke={colorTheme === 'green' ? '#22C55E' : '#3B82F6'} fillOpacity={1} fill="url(#colorBlue)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div>
            <div className="stat-pill"><div className="stat-header"><div className="stat-icon icon-green">⏱️</div><div className="stat-info"><span className="stat-title">CYCLE TIME TRUNG BÌNH</span><span className="stat-value">{metrics.avgCycleTime} ngày</span></div></div><div className="stat-chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparkData2}><defs><linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke="#10B981" fillOpacity={1} fill="url(#colorGreen)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div>
            <div className="stat-pill"><div className="stat-header"><div className="stat-icon icon-purple">🕒</div><div className="stat-info"><span className="stat-title">LEAD TIME TRUNG BÌNH</span><span className="stat-value">{metrics.avgLeadTime} ngày</span></div></div><div className="stat-chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparkData3}><defs><linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} /><stop offset="95%" stopColor="#A855F7" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke="#A855F7" fillOpacity={1} fill="url(#colorPurple)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div>
            <div className="stat-pill"><div className="stat-header"><div className="stat-icon icon-orange">📈</div><div className="stat-info"><span className="stat-title">PRODUCTIVITY</span><span className="stat-value">{metrics.teamProductivity} tasks/d</span></div></div><div className="stat-chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparkData4}><defs><linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke="#F59E0B" fillOpacity={1} fill="url(#colorOrange)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></div>
            <div className={`stat-pill ${metrics.sprintHealth.includes("RUI RO") || metrics.sprintHealth === "CHƯA CÓ DỮ LIỆU" ? "danger-pill" : ""}`}>
              <div className="stat-header"><div className="stat-icon icon-red">📉</div><div className="stat-info"><span className="stat-title">DỰ BÁO HOÀN THÀNH</span><span className="stat-value">{metrics.sprintHealth}</span></div></div>
              <div className="stat-chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparkData5}><defs><linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke="#EF4444" fillOpacity={1} fill="url(#colorRed)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            <div className="chart-box">
              <div className="chart-header-row"><h3>📉 BIỂU ĐỒ BURNDOWN {selectedSprint === 'All' ? '(TỔNG QUAN)' : ''}</h3></div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={filteredBurndown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="colorRedMain" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FECACA" stopOpacity={0.5} /><stop offset="95%" stopColor="#FEF2F2" stopOpacity={0.1} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colorTheme === 'dark' ? '#334155' : (colorTheme === 'blue' ? '#BAE6FD' : (colorTheme === 'green' ? '#BBF7D0' : '#E2E8F0'))} />
                  <XAxis dataKey="date" minTickGap={2} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#64748B', fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '15px', fontWeight: 600 }} />
                  <Line type="monotone" dataKey="idealLine" name="Đường dự kiến" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Area type="monotone" dataKey="tasksRemaining" name="Công việc còn lại" stroke="#EF4444" fill="url(#colorRedMain)" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="tasksClosed" name="Đã hoàn thành" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-box">
              <div className="chart-header-row"><h3>📈 HIỆU SUẤT THEO {selectedSprint === 'All' ? 'GIAI ĐOẠN' : 'NGÀY'}</h3></div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={filteredProductivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colorTheme === 'dark' ? '#334155' : (colorTheme === 'blue' ? '#BAE6FD' : (colorTheme === 'green' ? '#BBF7D0' : '#E2E8F0'))} />
                  <XAxis dataKey="date" minTickGap={2} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#64748B', fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ paddingTop: '15px', fontWeight: 600 }} />
                  <Bar dataKey="completed" name="Task Hoàn Thành" fill={colorTheme === 'green' ? '#16A34A' : '#3B82F6'} radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="leaderboard-box">
              <div className="chart-header-row">
                <h3>🏆 TOP THÀNH VIÊN</h3>
                <select className="sprint-selector" value={leaderboardSort} onChange={(e) => setLeaderboardSort(e.target.value)}>
                  <option value="sp">Theo SP</option>
                  <option value="tasks">Theo Task</option>
                </select>
              </div>
              <div style={{ maxHeight: '270px', overflowY: 'auto', paddingRight: '5px' }}>
                {sortedMembers.length > 0 ? sortedMembers.map(member => (
                  <div className="lb-row" key={member.name}>
                    <div className="lb-rank">{member.rank}</div>
                    <img src={member.avatar} alt="avatar" className="lb-avatar" />
                    <div className="lb-name" title={member.name}>{member.name}</div>
                    <div className="lb-bar-wrapper"><div className="lb-bar-fill" style={{ width: `${member.percent}%` }}></div></div>
                    <div className="lb-score">{member[leaderboardSort]} {leaderboardSort === 'sp' ? 'SP' : 'Tasks'}</div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', color: '#94A3B8', marginTop: '40px', fontWeight: 600 }}>Chưa có dữ liệu.</div>
                )}
              </div>
            </div>
          </div>

          <div className="kanban-grid">
            <div className="kanban-col">
              <div className="col-header header-todo">CHƯA LÀM (TO DO) <span className="task-count">{metrics.kanban.todo.length}</span></div>
              {metrics.kanban.todo.slice(0, limits.todo).map(t => <TaskCard key={t.id} task={t} />)}
              {metrics.kanban.todo.length > limits.todo && <button className="btn-load-more" onClick={() => setLimits({ ...limits, todo: limits.todo + 30 })}>▼ Xem thêm</button>}
            </div>
            <div className="kanban-col">
              <div className="col-header header-progress">ĐANG LÀM (IN PROGRESS) <span className="task-count">{metrics.kanban.inProgress.length}</span></div>
              {metrics.kanban.inProgress.slice(0, limits.inProgress).map(t => <TaskCard key={t.id} task={t} />)}
              {metrics.kanban.inProgress.length > limits.inProgress && <button className="btn-load-more" onClick={() => setLimits({ ...limits, inProgress: limits.inProgress + 30 })}>▼ Xem thêm</button>}
            </div>
            <div className="kanban-col">
              <div className="col-header header-done">HOÀN THÀNH (DONE) <span className="task-count">{metrics.kanban.done.length}</span></div>
              {metrics.kanban.done.slice(0, limits.done).map(t => <TaskCard key={t.id} task={t} />)}
              {metrics.kanban.done.length > limits.done && <button className="btn-load-more" onClick={() => setLimits({ ...limits, done: limits.done + 30 })}>▼ Xem thêm</button>}
            </div>
          </div>

          <div className="chart-box" style={{ marginTop: '0px' }}>
            <h3 style={{ borderBottom: `1px solid ${colorTheme === 'dark' ? '#334155' : (colorTheme === 'blue' ? '#BAE6FD' : (colorTheme === 'green' ? '#BBF7D0' : '#E2E8F0'))}`, paddingBottom: '16px', marginBottom: '0' }}>🔍 CHI TIẾT TỪNG TASK & DỰ BÁO AI</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>MÃ TASK</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>TÊN TASK</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>LEAD TIME</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>CYCLE TIME</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>CHẤT LƯỢNG (NLP)</th>
                  <th style={{ padding: '16px', color: '#64748B', fontSize: '13px' }}>DỰ BÁO AI ML</th>
                </tr>
              </thead>
              <tbody>
                {metrics.tasks.slice(0, limits.table).map((task, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${colorTheme === 'dark' ? '#1E293B' : (colorTheme === 'blue' ? '#E0F2FE' : (colorTheme === 'green' ? '#DCFCE7' : '#F1F5F9'))}` }}>
                    <td style={{ padding: '16px', fontWeight: '800', color: '#3B82F6' }}>{task.id}</td>
                    <td style={{ padding: '16px', fontWeight: '600' }}>{task.title}</td>
                    <td style={{ padding: '16px', color: '#64748B', fontWeight: '500' }}>{task.leadTime?.toFixed(2)} d</td>
                    <td style={{ padding: '16px', color: '#64748B', fontWeight: '500' }}>{task.cycleTime?.toFixed(2)} d</td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: '700', color: (task.nlpStatus?.includes('⚠️')) ? '#EF4444' : '#10B981' }}>{task.nlpStatus || "Đang phân tích..."}</td>
                    <td style={{ padding: '16px' }}>
                      {task.aiRisk === 'High' ? <span style={{ background: '#FEE2E2', color: '#EF4444', padding: '6px 12px', borderRadius: '20px', fontWeight: '800', fontSize: '12px' }}>🔴 Rủi ro</span>
                        : <span style={{ background: '#DCFCE7', color: '#10B981', padding: '6px 12px', borderRadius: '20px', fontWeight: '800', fontSize: '12px' }}>🟢 An toàn</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {metrics.tasks.length > limits.table && <button className="btn-load-more" style={{ marginTop: '20px' }} onClick={() => setLimits({ ...limits, table: limits.table + 30 })}>▼ Xem thêm 30 dòng</button>}
          </div>
        </div>
      </main>

      <div className="chat-widget-container">
        <div className={`chat-box-window ${isChatOpen ? '' : 'hidden'}`}>
          <div className="chat-header"><span>🤖 AI Scrum Master</span><button onClick={() => setIsChatOpen(false)}>×</button></div>
          <div className="chat-body" ref={chatBodyRef}>
            {chatMessages.map((msg, index) => (<div key={index} className={`chat-msg ${msg.sender}`}>{msg.text}</div>))}
            {isAiTyping && <div className="chat-msg ai typing-indicator"><span></span><span></span><span></span></div>}
          </div>
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input type="text" placeholder="Hỏi AI về dự án..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isAiTyping} />
            <button type="submit" disabled={isAiTyping}>➤</button>
          </form>
        </div>
        <button className="chat-toggle-btn" onClick={() => setIsChatOpen(!isChatOpen)}>{isChatOpen ? '✖' : '🤖'}</button>
      </div>
    </div>
  );
};

export default Dashboard;