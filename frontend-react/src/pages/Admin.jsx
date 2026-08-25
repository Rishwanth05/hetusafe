import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

const STATUS_OPTIONS = ['active','under_review','under_construction','being_monitored','partially_fixed','resolved']
const STATUS_COLORS = { active:'#dc2626', under_review:'#7c3aed', under_construction:'#d97706', being_monitored:'#0891b2', partially_fixed:'#0284c7', resolved:'#16a34a' }
const STATUS_LABELS = { active:'Active', under_review:'Under Review', under_construction:'Under Construction', being_monitored:'Being Monitored', partially_fixed:'Partially Fixed', resolved:'Resolved' }

export default function Admin() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [reports, setReports] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalReports, setTotalReports] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reportFilter, setReportFilter] = useState({ status: '', severity: '' })
  const [broadcast, setBroadcast] = useState({ title: '', message: '', severity: 'medium' })
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [adminCategories, setAdminCategories] = useState([])
  const [catForm, setCatForm] = useState({ name: '', icon: '' })
  const [catMsg, setCatMsg] = useState('')

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return }
    loadStats()
  }, [user])

  useEffect(() => {
    if (tab === 'users') loadUsers()
    if (tab === 'reports') loadReports()
    if (tab === 'analytics') loadAnalytics()
    if (tab === 'audit') loadAuditLog()
    if (tab === 'categories') loadAdminCategories()
  }, [tab, reportFilter])

  const loadAuditLog = async () => {
    try {
      const { data } = await client.get('/admin/audit-log?limit=100')
      setAuditLog(data.entries)
      setAuditTotal(data.total)
    } catch { /* silently fail */ }
  }

  const loadAdminCategories = async () => {
    try {
      const { data } = await client.get('/master/categories')
      setAdminCategories(data)
    } catch { setCatMsg('Failed to load categories') }
  }

  const addCategory = async () => {
    if (!catForm.name.trim()) { setCatMsg('Name is required'); return }
    try {
      await client.post('/master/categories', catForm)
      setCatForm({ name: '', icon: '' })
      setCatMsg('Category added ✅')
      loadAdminCategories()
      setTimeout(() => setCatMsg(''), 3000)
    } catch (err) {
      setCatMsg(err.response?.data?.message || 'Failed to add category')
    }
  }

  const toggleCategory = async (id) => {
    try {
      await client.patch(`/master/categories/${id}/toggle`)
      loadAdminCategories()
    } catch { setCatMsg('Toggle failed') }
  }

  const loadAnalytics = async () => {
    try {
      const { data } = await client.get('/admin/analytics')
      setAnalytics(data)
    } catch { /* silently fail */ }
  }

  const loadStats = async () => {
    try {
      const { data } = await client.get('/admin/stats')
      setStats(data)
    } catch { navigate('/dashboard') }
    finally { setLoading(false) }
  }

  const loadUsers = async () => {
    const { data } = await client.get(`/admin/users?search=${search}&limit=50`)
    setUsers(data.users)
    setTotalUsers(data.total)
  }

  const loadReports = async () => {
    const params = new URLSearchParams({ limit: 50, ...reportFilter }).toString()
    const { data } = await client.get(`/admin/reports?${params}`)
    setReports(data.reports)
    setTotalReports(data.total)
  }

  const deleteUser = async (id) => {
    if (!confirm('Permanently delete this user?')) return
    await client.delete(`/admin/users/${id}`)
    loadUsers()
  }

  const changeRole = async (id, role) => {
    await client.put(`/admin/users/${id}/role`, { role })
    loadUsers()
  }

  const updateReportStatus = async (id, status) => {
    await client.put(`/admin/reports/${id}/status`, { status })
    loadReports()
  }

  const deleteReport = async (id) => {
    if (!confirm('Permanently delete this report?')) return
    await client.delete(`/admin/reports/${id}`)
    loadReports()
  }

  const archiveReport = async (id) => {
    try {
      await client.post(`/admin/reports/${id}/archive`)
      loadReports()
    } catch (err) {
      alert(err.response?.data?.message || 'Archive failed')
    }
  }

  const unarchiveReport = async (id) => {
    try {
      await client.post(`/admin/reports/${id}/unarchive`)
      loadReports()
    } catch (err) {
      alert(err.response?.data?.message || 'Unarchive failed')
    }
  }

  const sendBroadcast = async () => {
    if (!broadcast.title || !broadcast.message) return
    await client.post('/admin/broadcast', broadcast)
    setBroadcastMsg('✅ Alert sent to all users!')
    setBroadcast({ title: '', message: '', severity: 'medium' })
    setTimeout(() => setBroadcastMsg(''), 3000)
  }

  function timeAgo(d) {
    const diff = (Date.now() - new Date(d)) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(d).toLocaleDateString()
  }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a', color:'#fff', fontSize:'18px' }}>Loading admin panel…</div>

  const navTabs = ['overview','analytics','users','reports','broadcast','audit','categories']

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', fontFamily:'system-ui,sans-serif' }}>
      {/* Top bar */}
      <div style={{ background:'#1e293b', borderBottom:'1px solid #334155', padding:'0 20px', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="16" fill="#16a34a"/>
            <path d="M28 10L14 16V28C14 36.4 20.2 44.2 28 46C35.8 44.2 42 36.4 42 28V16L28 10Z" fill="white"/>
            <path d="M22 28L26 32L34 24" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color:'#fff', fontWeight:'800', fontSize:'16px' }}>Hetusafe Admin</span>
          <span style={{ background:'#16a34a', color:'#fff', fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'6px' }}>ADMIN</span>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background:'#334155', color:'#94a3b8', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', cursor:'pointer' }}>← App</button>
          <button onClick={() => { logout(); navigate('/login') }} style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', cursor:'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ display:'flex', minHeight:'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{ width:'180px', background:'#1e293b', borderRight:'1px solid #334155', padding:'16px 0', flexShrink:0 }}>
          {navTabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              display:'block', width:'100%', textAlign:'left',
              padding:'10px 20px', border:'none', cursor:'pointer', fontSize:'14px',
              background: tab === t ? '#16a34a' : 'transparent',
              color: tab === t ? '#fff' : '#94a3b8',
              fontWeight: tab === t ? '700' : '400',
              borderLeft: tab === t ? '3px solid #4ade80' : '3px solid transparent',
            }}>
              {t === 'overview' && '📊 '}
              {t === 'analytics' && '📈 '}
              {t === 'users' && '👥 '}
              {t === 'reports' && '📋 '}
              {t === 'broadcast' && '📢 '}
              {t === 'audit' && '🔍 '}
              {t === 'categories' && '🏷️ '}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex:1, padding:'24px', overflowX:'auto' }}>

          {/* OVERVIEW */}
          {tab === 'overview' && stats && (
            <div>
              <h2 style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', margin:'0 0 20px' }}>System Overview</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'14px', marginBottom:'28px' }}>
                {[
                  { label:'Total Users', value: stats.stats.total_users, color:'#60a5fa', icon:'👥' },
                  { label:'Total Reports', value: stats.stats.total_reports, color:'#a78bfa', icon:'📋' },
                  { label:'Resolved', value: stats.stats.resolved_reports, color:'#4ade80', icon:'✅' },
                  { label:'Critical', value: stats.stats.critical_reports, color:'#f87171', icon:'🚨' },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', padding:'18px' }}>
                    <div style={{ fontSize:'24px', marginBottom:'6px' }}>{icon}</div>
                    <div style={{ fontSize:'30px', fontWeight:'800', color }}>{value}</div>
                    <div style={{ color:'#64748b', fontSize:'12px', marginTop:'4px' }}>{label}</div>
                  </div>
                ))}
              </div>

              <h3 style={{ color:'#f1f5f9', fontSize:'16px', fontWeight:'700', margin:'0 0 12px' }}>Recent Reports</h3>
              <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead>
                    <tr style={{ background:'#334155' }}>
                      {['ID','Type','Severity','Status','Reporter','Time'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#94a3b8', fontWeight:'600' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_reports.map(r => (
                      <tr key={r.id} style={{ borderTop:'1px solid #334155' }}>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>#{r.id}</td>
                        <td style={{ padding:'10px 14px', color:'#f1f5f9', fontWeight:'500' }}>{r.hazard_type}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ background:'#334155', color:'#f1f5f9', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', textTransform:'capitalize' }}>{r.severity}</span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ color: STATUS_COLORS[r.status] || '#94a3b8', fontWeight:'600', fontSize:'12px' }}>● {STATUS_LABELS[r.status] || r.status}</span>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#94a3b8' }}>{r.user_name || 'Anonymous'}</td>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>{timeAgo(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                <h2 style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', margin:0 }}>Users <span style={{ color:'#64748b', fontWeight:'400' }}>({totalUsers})</span></h2>
                <div style={{ display:'flex', gap:'8px' }}>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
                    style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', padding:'8px 12px', color:'#f1f5f9', fontSize:'13px', outline:'none', width:'200px' }}
                    onKeyDown={e => e.key === 'Enter' && loadUsers()} />
                  <button onClick={loadUsers} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:'8px', padding:'8px 14px', fontSize:'13px', cursor:'pointer' }}>Search</button>
                </div>
              </div>
              <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', minWidth:'600px' }}>
                  <thead>
                    <tr style={{ background:'#334155' }}>
                      {['Name','Email','Role','Reports','Verified','Joined','Actions'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#94a3b8', fontWeight:'600' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderTop:'1px solid #334155' }}>
                        <td style={{ padding:'10px 14px', color:'#f1f5f9', fontWeight:'500' }}>{u.name}</td>
                        <td style={{ padding:'10px 14px', color:'#94a3b8' }}>{u.email}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                            style={{ background:'#334155', color: u.role === 'admin' ? '#4ade80' : '#94a3b8', border:'1px solid #475569', borderRadius:'6px', padding:'3px 6px', fontSize:'12px', cursor:'pointer' }}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#f1f5f9' }}>{u.report_count}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ color: u.is_verified ? '#4ade80' : '#f87171', fontWeight:'700', fontSize:'12px' }}>{u.is_verified ? '✅' : '❌'}</span>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>{timeAgo(u.created_at)}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <button onClick={() => deleteUser(u.id)} style={{ background:'#7f1d1d', color:'#fca5a5', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {tab === 'reports' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                <h2 style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', margin:0 }}>Reports <span style={{ color:'#64748b', fontWeight:'400' }}>({totalReports})</span></h2>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  <select value={reportFilter.status} onChange={e => setReportFilter(f => ({ ...f, status: e.target.value }))}
                    style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', padding:'8px', color:'#f1f5f9', fontSize:'13px' }}>
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <select value={reportFilter.severity} onChange={e => setReportFilter(f => ({ ...f, severity: e.target.value }))}
                    style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'8px', padding:'8px', color:'#f1f5f9', fontSize:'13px' }}>
                    <option value="">All severities</option>
                    {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', minWidth:'700px' }}>
                  <thead>
                    <tr style={{ background:'#334155' }}>
                      {['ID','Type','Severity','Status','Reporter','Date','Archived','Actions'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#94a3b8', fontWeight:'600' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id} style={{ borderTop:'1px solid #334155' }}>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>#{r.id}</td>
                        <td style={{ padding:'10px 14px', color:'#f1f5f9', fontWeight:'500' }}>{r.hazard_type}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ background:'#334155', color:'#f1f5f9', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', textTransform:'capitalize' }}>{r.severity}</span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <select value={r.status} onChange={e => updateReportStatus(r.id, e.target.value)}
                            style={{ background:'#334155', color: STATUS_COLORS[r.status] || '#94a3b8', border:'1px solid #475569', borderRadius:'6px', padding:'3px 6px', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#94a3b8' }}>{r.user_name || 'Anonymous'}</td>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>{timeAgo(r.created_at)}</td>
                        <td style={{ padding:'10px 14px' }}>
                          {r.archived_at
                            ? <span style={{ background:'#1e3a5f', color:'#93c5fd', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'600' }}>📦 Archived</span>
                            : <span style={{ color:'#475569', fontSize:'11px' }}>—</span>
                          }
                        </td>
                        <td style={{ padding:'10px 14px', display:'flex', gap:'6px', alignItems:'center' }}>
                          {r.archived_at ? (
                            <button onClick={() => unarchiveReport(r.id)} style={{ background:'#1e3a5f', color:'#93c5fd', border:'1px solid #1d4ed8', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>Unarchive</button>
                          ) : (
                            <button onClick={() => archiveReport(r.id)} style={{ background:'#1e293b', color:'#94a3b8', border:'1px solid #334155', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>Archive</button>
                          )}
                          <button onClick={() => deleteReport(r.id)} style={{ background:'#7f1d1d', color:'#fca5a5', border:'none', borderRadius:'6px', padding:'4px 10px', fontSize:'12px', cursor:'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {tab === 'analytics' && (
            <div>
              <h2 style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', margin:'0 0 24px' }}>📈 Analytics</h2>

              {!analytics ? (
                <div style={{ color:'#64748b', fontSize:'14px' }}>Loading charts…</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>

                  {/* Avg resolution KPI */}
                  <div style={{ display:'flex', gap:'14px', flexWrap:'wrap' }}>
                    {[
                      { label:'Avg Resolution Time', value:`${analytics.avg_resolution_hours}h`, icon:'⏱️' },
                      { label:'Reports (30 days)', value: analytics.by_day.reduce((s,d) => s + d.count, 0), icon:'📋' },
                      { label:'Categories tracked', value: analytics.by_category.length, icon:'🏷️' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', padding:'16px 20px', flex:'1 1 160px' }}>
                        <div style={{ fontSize:'20px', marginBottom:'6px' }}>{icon}</div>
                        <div style={{ fontSize:'26px', fontWeight:'800', color:'#4ade80' }}>{value}</div>
                        <div style={{ color:'#64748b', fontSize:'12px', marginTop:'4px' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Line chart — reports over 30 days */}
                  <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'14px', padding:'24px' }}>
                    <h3 style={{ color:'#f1f5f9', fontSize:'15px', fontWeight:'700', margin:'0 0 20px' }}>Reports over last 30 days</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={analytics.by_day} margin={{ top:4, right:16, left:0, bottom:4 }}>
                        <defs>
                          <linearGradient id="lineGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a2f" vertical={false}/>
                        <XAxis dataKey="label" tick={{ fill:'#64748b', fontSize:11 }} interval={4} tickLine={false} axisLine={false}/>
                        <YAxis tick={{ fill:'#64748b', fontSize:11 }} tickLine={false} axisLine={false} allowDecimals={false}/>
                        <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9', fontSize:'13px' }} cursor={{ stroke:'#334155' }}/>
                        <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:'#4ade80' }} animationDuration={800}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar chart — by category */}
                  <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'14px', padding:'24px' }}>
                    <h3 style={{ color:'#f1f5f9', fontSize:'15px', fontWeight:'700', margin:'0 0 20px' }}>Reports by category</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={analytics.by_category} layout="vertical" margin={{ top:0, right:16, left:8, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a2f" horizontal={false}/>
                        <XAxis type="number" tick={{ fill:'#64748b', fontSize:11 }} tickLine={false} axisLine={false} allowDecimals={false}/>
                        <YAxis type="category" dataKey="label" tick={{ fill:'#94a3b8', fontSize:11 }} tickLine={false} axisLine={false} width={140}/>
                        <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9', fontSize:'13px' }} cursor={{ fill:'rgba(22,163,74,0.06)' }}/>
                        <Bar dataKey="count" fill="#16a34a" radius={[0,6,6,0]} animationDuration={800}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie chart — by severity */}
                  <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'14px', padding:'24px', maxWidth:'480px' }}>
                    <h3 style={{ color:'#f1f5f9', fontSize:'15px', fontWeight:'700', margin:'0 0 20px' }}>Reports by severity</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={analytics.by_severity} dataKey="count" nameKey="label"
                          cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                          paddingAngle={3} animationDuration={800}
                        >
                          {analytics.by_severity.map((entry) => (
                            <Cell key={entry.label} fill={
                              entry.label === 'critical' ? '#dc2626' :
                              entry.label === 'high' ? '#f97316' :
                              entry.label === 'medium' ? '#eab308' : '#16a34a'
                            }/>
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', color:'#f1f5f9', fontSize:'13px' }}/>
                        <Legend wrapperStyle={{ color:'#94a3b8', fontSize:'13px' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* BROADCAST */}
          {tab === 'broadcast' && (
            <div style={{ maxWidth:'560px' }}>
              <h2 style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', margin:'0 0 20px' }}>📢 Broadcast Alert</h2>
              <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'14px', padding:'24px', display:'flex', flexDirection:'column', gap:'14px' }}>
                <div>
                  <label style={{ color:'#94a3b8', fontSize:'13px', fontWeight:'600', display:'block', marginBottom:'6px' }}>Title</label>
                  <input value={broadcast.title} onChange={e => setBroadcast(b => ({ ...b, title: e.target.value }))} placeholder="Alert title…"
                    style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', padding:'10px 12px', color:'#f1f5f9', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ color:'#94a3b8', fontSize:'13px', fontWeight:'600', display:'block', marginBottom:'6px' }}>Message</label>
                  <textarea value={broadcast.message} onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))} placeholder="Alert message…" rows={4}
                    style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', padding:'10px 12px', color:'#f1f5f9', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box', resize:'vertical', fontFamily:'inherit' }} />
                </div>
                <div>
                  <label style={{ color:'#94a3b8', fontSize:'13px', fontWeight:'600', display:'block', marginBottom:'6px' }}>Severity</label>
                  <select value={broadcast.severity} onChange={e => setBroadcast(b => ({ ...b, severity: e.target.value }))}
                    style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', padding:'10px', color:'#f1f5f9', fontSize:'14px', outline:'none', width:'100%' }}>
                    {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                {broadcastMsg && <p style={{ color:'#4ade80', fontWeight:'600', margin:0 }}>{broadcastMsg}</p>}
                <button onClick={sendBroadcast} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:'8px', padding:'12px', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
                  Send Alert to All Users
                </button>
              </div>
            </div>
          )}

          {/* CATEGORIES */}
          {tab === 'categories' && (
            <div>
              <h2 style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', margin:'0 0 20px' }}>🏷️ Hazard Categories</h2>

              {/* Add Category form */}
              <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', padding:'20px', marginBottom:'24px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end' }}>
                <div style={{ flex:'1 1 180px' }}>
                  <label style={{ color:'#94a3b8', fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'4px' }}>Name</label>
                  <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sinkhole"
                    style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', padding:'8px 12px', color:'#f1f5f9', fontSize:'13px', outline:'none', width:'100%', boxSizing:'border-box' }} />
                </div>
                <div style={{ flex:'1 1 120px' }}>
                  <label style={{ color:'#94a3b8', fontSize:'12px', fontWeight:'600', display:'block', marginBottom:'4px' }}>Icon (emoji)</label>
                  <input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="e.g. 🕳️"
                    style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', padding:'8px 12px', color:'#f1f5f9', fontSize:'13px', outline:'none', width:'100%', boxSizing:'border-box' }} />
                </div>
                <button onClick={addCategory} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:'8px', padding:'9px 18px', fontSize:'13px', fontWeight:'700', cursor:'pointer', flexShrink:0 }}>
                  + Add Category
                </button>
              </div>
              {catMsg && <p style={{ color: catMsg.includes('✅') ? '#4ade80' : '#f87171', fontWeight:'600', marginBottom:'12px', fontSize:'13px' }}>{catMsg}</p>}

              {/* Categories table */}
              <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', minWidth:'500px' }}>
                  <thead>
                    <tr style={{ background:'#334155' }}>
                      {['ID','Name','Icon','Status','Actions'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#94a3b8', fontWeight:'600' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminCategories.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding:'24px', textAlign:'center', color:'#475569' }}>No categories found.</td></tr>
                    ) : adminCategories.map(cat => (
                      <tr key={cat.id} style={{ borderTop:'1px solid #334155' }}>
                        <td style={{ padding:'10px 14px', color:'#64748b' }}>{cat.id}</td>
                        <td style={{ padding:'10px 14px', color:'#f1f5f9', fontWeight:'500' }}>{cat.name}</td>
                        <td style={{ padding:'10px 14px', color:'#f1f5f9', fontSize:'18px' }}>{cat.icon || '—'}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ color: cat.is_active ? '#4ade80' : '#f87171', fontWeight:'700', fontSize:'12px' }}>
                            {cat.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <button onClick={() => toggleCategory(cat.id)}
                            style={{ background: cat.is_active ? '#7f1d1d' : '#14532d', color: cat.is_active ? '#fca5a5' : '#86efac', border:'none', borderRadius:'6px', padding:'4px 12px', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}>
                            {cat.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === 'audit' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                <h2 style={{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', margin:0 }}>🔍 Audit Log <span style={{ color:'#64748b', fontWeight:'400' }}>({auditTotal})</span></h2>
                <span style={{ fontSize:'12px', color:'#475569' }}>Append-only — no entries can be deleted</span>
              </div>
              <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'12px', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', minWidth:'700px' }}>
                  <thead>
                    <tr style={{ background:'#334155' }}>
                      {['Time','Admin','Action','Type','Target ID','Changed'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', color:'#94a3b8', fontWeight:'600' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding:'24px', textAlign:'center', color:'#475569' }}>No audit entries yet.</td></tr>
                    ) : auditLog.map(e => {
                      const oldV = e.old_value ? JSON.stringify(e.old_value) : '—'
                      const newV = e.new_value ? JSON.stringify(e.new_value) : '—'
                      const changed = e.old_value || e.new_value
                        ? `${oldV} → ${newV}`
                        : '—'
                      return (
                        <tr key={e.id} style={{ borderTop:'1px solid #334155' }}>
                          <td style={{ padding:'10px 14px', color:'#64748b', whiteSpace:'nowrap' }}>{timeAgo(e.created_at)}</td>
                          <td style={{ padding:'10px 14px', color:'#94a3b8' }}>{e.admin_email}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ background:'#1e3a5f', color:'#60a5fa', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.3px' }}>
                              {e.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding:'10px 14px', color:'#94a3b8', textTransform:'capitalize' }}>{e.target_type}</td>
                          <td style={{ padding:'10px 14px', color:'#64748b' }}>{e.target_id || '—'}</td>
                          <td style={{ padding:'10px 14px', color:'#64748b', maxWidth:'260px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={changed}>{changed}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}