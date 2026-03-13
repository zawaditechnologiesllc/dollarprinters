import React, { useCallback, useEffect, useRef, useState } from 'react';
import './admin.scss';

type Section = 'bots' | 'announcements' | 'analytics' | 'system';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bot {
    id: string;
    name: string;
    description: string;
    fileName: string;
    category: string;
    icon: string;
    visible: boolean;
}

interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    active: boolean;
    createdAt: string;
}

interface Analytics {
    totalPageViews: number;
    todayViews: number;
    last7Days: { date: string; views: number }[];
    topBots: { id: string; name: string; count: number }[];
    pageBreakdown: Record<string, number>;
}

interface SystemStatus {
    uptime: number;
    nodeVersion: string;
    memory: { heapUsed: number; heapTotal: number; rss: number };
    env: Record<string, boolean>;
    derivApi: { status: string; latencyMs: number | null };
    bots: { inManifest: number; xmlFilesOnDisk: number; visible: number };
}

// ─── API Helper ───────────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown) {
    const opts: RequestInit = { method, credentials: 'include' };
    if (body instanceof FormData) {
        opts.body = body;
    } else if (body) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
    }
    const r = await fetch(path, opts);
    return r.json();
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const [user, setUser] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);
    const [section, setSection] = useState<Section>('bots');

    useEffect(() => {
        api('GET', '/api/admin/verify').then(d => {
            if (d.success) setUser(d.user);
            else window.location.href = '/admin-login';
        }).catch(() => { window.location.href = '/admin-login'; })
        .finally(() => setVerifying(false));
    }, []);

    const logout = async () => {
        await api('POST', '/api/admin/logout');
        window.location.href = '/admin-login';
    };

    if (verifying) return <div className='admin-loading'><div className='admin-loading__spinner' /><p>Verifying…</p></div>;
    if (!user) return null;

    const nav: { id: Section; label: string; icon: string }[] = [
        { id: 'bots', label: 'Bot Management', icon: '🤖' },
        { id: 'announcements', label: 'Announcements', icon: '📢' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
        { id: 'system', label: 'System Status', icon: '⚙️' },
    ];

    return (
        <div className='admin'>
            <aside className='admin__sidebar'>
                <div className='admin__brand'>
                    <span className='admin__brand-icon'>🛡</span>
                    <span className='admin__brand-name'>Admin Panel</span>
                </div>
                <nav className='admin__nav'>
                    {nav.map(n => (
                        <button key={n.id} className={`admin__nav-item${section === n.id ? ' admin__nav-item--active' : ''}`} onClick={() => setSection(n.id)}>
                            <span>{n.icon}</span>{n.label}
                        </button>
                    ))}
                </nav>
                <div className='admin__sidebar-footer'>
                    <div className='admin__user'><span>👤</span><span>{user}</span></div>
                    <button className='admin__logout' onClick={logout}>Sign Out</button>
                </div>
            </aside>
            <main className='admin__main'>
                <header className='admin__header'>
                    <h1 className='admin__page-title'>{nav.find(n => n.id === section)?.label}</h1>
                </header>
                <div className='admin__content'>
                    {section === 'bots' && <BotSection />}
                    {section === 'announcements' && <AnnouncementsSection />}
                    {section === 'analytics' && <AnalyticsSection />}
                    {section === 'system' && <SystemSection />}
                </div>
            </main>
        </div>
    );
}

// ─── Bot Management ───────────────────────────────────────────────────────────

function BotSection() {
    const [bots, setBots] = useState<Bot[]>([]);
    const [untracked, setUntracked] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Bot | null>(null);
    const [toast, setToast] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const d = await api('GET', '/api/admin/bots');
        if (d.success) { setBots(d.bots); setUntracked(d.untrackedFiles || []); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const saveEdit = async () => {
        if (!editing) return;
        const d = await api('PUT', `/api/admin/bots/${editing.id}`, editing);
        if (d.success) { setBots(prev => prev.map(b => b.id === editing.id ? d.bot : b)); setEditing(null); showToast('Bot updated.'); }
    };

    const toggleVisible = async (bot: Bot) => {
        const d = await api('PUT', `/api/admin/bots/${bot.id}`, { visible: !bot.visible });
        if (d.success) setBots(prev => prev.map(b => b.id === bot.id ? d.bot : b));
    };

    const deleteBot = async (bot: Bot) => {
        if (!confirm(`Delete "${bot.name}"? This also removes the XML file.`)) return;
        const d = await api('DELETE', `/api/admin/bots/${bot.id}`);
        if (d.success) { setBots(prev => prev.filter(b => b.id !== bot.id)); showToast('Bot deleted.'); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        const d = await api('POST', '/api/admin/bots/upload', fd);
        if (d.success) { setBots(prev => [...prev, d.bot]); showToast(`"${d.bot.name}" uploaded.`); }
        else showToast('Upload failed: ' + d.error);
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    if (loading) return <div className='admin-spinner' />;

    return (
        <div>
            {toast && <div className='admin-toast'>{toast}</div>}
            <div className='admin__toolbar'>
                <span className='admin__count'>{bots.length} bots · {bots.filter(b => b.visible).length} visible</span>
                <label className='admin__upload-btn'>
                    {uploading ? 'Uploading…' : '+ Upload XML'}
                    <input ref={fileRef} type='file' accept='.xml' onChange={handleUpload} hidden />
                </label>
            </div>

            {untracked.length > 0 && (
                <div className='admin__notice'>
                    ⚠ {untracked.length} XML file(s) on disk not in manifest: {untracked.join(', ')}
                </div>
            )}

            <div className='admin__bot-list'>
                {bots.map(bot => (
                    <div key={bot.id} className={`admin__bot-row${bot.visible ? '' : ' admin__bot-row--hidden'}`}>
                        <span className='admin__bot-icon'>{bot.icon}</span>
                        <div className='admin__bot-info'>
                            <strong>{bot.name}</strong>
                            <span className='admin__bot-category'>{bot.category}</span>
                            <span className='admin__bot-file'>{bot.fileName}</span>
                            <p className='admin__bot-desc'>{bot.description}</p>
                        </div>
                        <div className='admin__bot-actions'>
                            <button className={`admin__toggle${bot.visible ? ' admin__toggle--on' : ''}`} onClick={() => toggleVisible(bot)}>
                                {bot.visible ? 'Visible' : 'Hidden'}
                            </button>
                            <button className='admin__btn-edit' onClick={() => setEditing({ ...bot })}>Edit</button>
                            <button className='admin__btn-del' onClick={() => deleteBot(bot)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {editing && (
                <div className='admin__modal-overlay' onClick={() => setEditing(null)}>
                    <div className='admin__modal' onClick={e => e.stopPropagation()}>
                        <h2>Edit Bot</h2>
                        {(['name', 'description', 'category', 'icon'] as const).map(field => (
                            <div key={field} className='admin__field'>
                                <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                                {field === 'description'
                                    ? <textarea value={editing[field]} onChange={e => setEditing({ ...editing, [field]: e.target.value })} rows={3} />
                                    : <input value={editing[field]} onChange={e => setEditing({ ...editing, [field]: e.target.value })} />
                                }
                            </div>
                        ))}
                        <div className='admin__modal-actions'>
                            <button className='admin__btn-save' onClick={saveEdit}>Save</button>
                            <button className='admin__btn-cancel' onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Announcements ────────────────────────────────────────────────────────────

function AnnouncementsSection() {
    const [list, setList] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'success' });
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [toast, setToast] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const d = await api('GET', '/api/admin/announcements');
        if (d.success) setList(d.announcements);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        const d = await api('POST', '/api/admin/announcements', form);
        if (d.success) { setList(prev => [...prev, d.announcement]); setForm({ title: '', message: '', type: 'info' }); showToast('Announcement created.'); }
    };

    const toggleActive = async (item: Announcement) => {
        const d = await api('PUT', `/api/admin/announcements/${item.id}`, { active: !item.active });
        if (d.success) setList(prev => prev.map(a => a.id === item.id ? d.announcement : a));
    };

    const saveEdit = async () => {
        if (!editing) return;
        const d = await api('PUT', `/api/admin/announcements/${editing.id}`, editing);
        if (d.success) { setList(prev => prev.map(a => a.id === editing.id ? d.announcement : a)); setEditing(null); showToast('Updated.'); }
    };

    const remove = async (id: string) => {
        if (!confirm('Delete this announcement?')) return;
        const d = await api('DELETE', `/api/admin/announcements/${id}`);
        if (d.success) { setList(prev => prev.filter(a => a.id !== id)); showToast('Deleted.'); }
    };

    if (loading) return <div className='admin-spinner' />;

    return (
        <div>
            {toast && <div className='admin-toast'>{toast}</div>}
            <form className='admin__announce-form' onSubmit={create}>
                <h3>New Announcement</h3>
                <div className='admin__field'>
                    <label>Title</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className='admin__field'>
                    <label>Message</label>
                    <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} required />
                </div>
                <div className='admin__field'>
                    <label>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'info' | 'warning' | 'success' })}>
                        <option value='info'>Info</option>
                        <option value='warning'>Warning</option>
                        <option value='success'>Success</option>
                    </select>
                </div>
                <button type='submit' className='admin__btn-save'>Publish</button>
            </form>

            <h3 style={{ margin: '28px 0 12px', color: '#aaa', fontSize: '14px' }}>EXISTING ({list.length})</h3>
            {list.length === 0 && <p className='admin__empty'>No announcements yet.</p>}
            {list.map(item => (
                <div key={item.id} className={`admin__announce-row admin__announce-row--${item.type}${item.active ? '' : ' admin__announce-row--inactive'}`}>
                    <div className='admin__announce-meta'>
                        <span className={`admin__badge admin__badge--${item.type}`}>{item.type}</span>
                        <span className='admin__announce-date'>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <div className='admin__bot-actions'>
                        <button className={`admin__toggle${item.active ? ' admin__toggle--on' : ''}`} onClick={() => toggleActive(item)}>
                            {item.active ? 'Active' : 'Inactive'}
                        </button>
                        <button className='admin__btn-edit' onClick={() => setEditing({ ...item })}>Edit</button>
                        <button className='admin__btn-del' onClick={() => remove(item.id)}>Delete</button>
                    </div>
                </div>
            ))}

            {editing && (
                <div className='admin__modal-overlay' onClick={() => setEditing(null)}>
                    <div className='admin__modal' onClick={e => e.stopPropagation()}>
                        <h2>Edit Announcement</h2>
                        <div className='admin__field'><label>Title</label><input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
                        <div className='admin__field'><label>Message</label><textarea value={editing.message} onChange={e => setEditing({ ...editing, message: e.target.value })} rows={3} /></div>
                        <div className='admin__field'>
                            <label>Type</label>
                            <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as 'info' | 'warning' | 'success' })}>
                                <option value='info'>Info</option><option value='warning'>Warning</option><option value='success'>Success</option>
                            </select>
                        </div>
                        <div className='admin__modal-actions'>
                            <button className='admin__btn-save' onClick={saveEdit}>Save</button>
                            <button className='admin__btn-cancel' onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function AnalyticsSection() {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api('GET', '/api/admin/analytics').then(d => { if (d.success) setData(d); setLoading(false); });
    }, []);

    if (loading) return <div className='admin-spinner' />;
    if (!data) return <p>Failed to load analytics.</p>;

    const maxViews = Math.max(...data.last7Days.map(d => d.views), 1);

    return (
        <div className='admin__analytics'>
            <div className='admin__stat-row'>
                <div className='admin__stat'><div className='admin__stat-value'>{data.totalPageViews.toLocaleString()}</div><div className='admin__stat-label'>Total Page Views</div></div>
                <div className='admin__stat'><div className='admin__stat-value'>{data.todayViews.toLocaleString()}</div><div className='admin__stat-label'>Today</div></div>
                <div className='admin__stat'><div className='admin__stat-value'>{data.topBots.reduce((s, b) => s + b.count, 0).toLocaleString()}</div><div className='admin__stat-label'>Bot Loads</div></div>
            </div>

            <div className='admin__chart-card'>
                <h3>Last 7 Days</h3>
                <div className='admin__bar-chart'>
                    {data.last7Days.map(d => (
                        <div key={d.date} className='admin__bar-col'>
                            <div className='admin__bar-fill' style={{ height: `${(d.views / maxViews) * 100}%` }} title={`${d.views} views`} />
                            <span className='admin__bar-label'>{d.date.slice(5)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className='admin__two-col'>
                <div className='admin__chart-card'>
                    <h3>Top Bots Loaded</h3>
                    {data.topBots.length === 0 && <p className='admin__empty'>No bot loads tracked yet.</p>}
                    {data.topBots.map(b => (
                        <div key={b.id} className='admin__rank-row'>
                            <span>{b.name}</span>
                            <span className='admin__rank-count'>{b.count}</span>
                        </div>
                    ))}
                </div>
                <div className='admin__chart-card'>
                    <h3>Page Breakdown</h3>
                    {Object.keys(data.pageBreakdown).length === 0 && <p className='admin__empty'>No page views tracked yet.</p>}
                    {Object.entries(data.pageBreakdown).sort((a, b) => b[1] - a[1]).map(([page, count]) => (
                        <div key={page} className='admin__rank-row'>
                            <span>{page}</span>
                            <span className='admin__rank-count'>{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── System Status ────────────────────────────────────────────────────────────

function SystemSection() {
    const [data, setData] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const d = await api('GET', '/api/admin/system');
        if (d.success) setData(d);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <div className='admin-spinner' />;
    if (!data) return <p>Failed to load system status.</p>;

    const formatUptime = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const statusDot = (ok: boolean | string) => {
        const cls = ok === true || ok === 'connected' ? 'green' : ok === 'timeout' ? 'orange' : 'red';
        return <span className={`admin__dot admin__dot--${cls}`} />;
    };

    return (
        <div className='admin__system'>
            <div className='admin__sys-grid'>
                <div className='admin__sys-card'>
                    <h3>API Server</h3>
                    <div className='admin__sys-row'><span>Status</span><span className='admin__sys-val'>{statusDot(true)} Running</span></div>
                    <div className='admin__sys-row'><span>Uptime</span><span className='admin__sys-val'>{formatUptime(data.uptime)}</span></div>
                    <div className='admin__sys-row'><span>Node.js</span><span className='admin__sys-val'>{data.nodeVersion}</span></div>
                </div>

                <div className='admin__sys-card'>
                    <h3>Memory</h3>
                    <div className='admin__sys-row'><span>Heap Used</span><span className='admin__sys-val'>{data.memory.heapUsed} MB</span></div>
                    <div className='admin__sys-row'><span>Heap Total</span><span className='admin__sys-val'>{data.memory.heapTotal} MB</span></div>
                    <div className='admin__sys-row'><span>RSS</span><span className='admin__sys-val'>{data.memory.rss} MB</span></div>
                </div>

                <div className='admin__sys-card'>
                    <h3>Deriv API</h3>
                    <div className='admin__sys-row'><span>WebSocket</span><span className='admin__sys-val'>{statusDot(data.derivApi.status)} {data.derivApi.status}</span></div>
                    {data.derivApi.latencyMs !== null && (
                        <div className='admin__sys-row'><span>Latency</span><span className='admin__sys-val'>{data.derivApi.latencyMs} ms</span></div>
                    )}
                </div>

                <div className='admin__sys-card'>
                    <h3>Environment</h3>
                    {Object.entries(data.env).map(([k, v]) => (
                        <div key={k} className='admin__sys-row'><span>{k}</span><span className='admin__sys-val'>{statusDot(v)} {v ? 'Set' : 'Missing'}</span></div>
                    ))}
                </div>

                <div className='admin__sys-card'>
                    <h3>Bot Library</h3>
                    <div className='admin__sys-row'><span>In manifest</span><span className='admin__sys-val'>{data.bots.inManifest}</span></div>
                    <div className='admin__sys-row'><span>XML on disk</span><span className='admin__sys-val'>{data.bots.xmlFilesOnDisk}</span></div>
                    <div className='admin__sys-row'><span>Visible to users</span><span className='admin__sys-val'>{data.bots.visible}</span></div>
                </div>
            </div>
            <button className='admin__btn-refresh' onClick={load}>↻ Refresh</button>
        </div>
    );
}
