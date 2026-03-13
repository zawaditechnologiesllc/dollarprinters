import React, { useEffect, useState } from 'react';
import './admin.scss';

type Section = 'bot-management' | 'content' | 'analytics' | 'system';

interface AdminUser {
    user: string;
}

export default function AdminDashboard() {
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const [verifying, setVerifying] = useState(true);
    const [activeSection, setActiveSection] = useState<Section>('bot-management');

    useEffect(() => {
        fetch('/api/admin/verify', { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setAdminUser({ user: data.user });
                } else {
                    window.location.href = '/admin-login';
                }
            })
            .catch(() => {
                window.location.href = '/admin-login';
            })
            .finally(() => setVerifying(false));
    }, []);

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/admin-login';
    };

    if (verifying) {
        return (
            <div className='admin-loading'>
                <div className='admin-loading__spinner' />
                <p>Verifying session…</p>
            </div>
        );
    }

    if (!adminUser) return null;

    const navItems: { id: Section; label: string; icon: string }[] = [
        { id: 'bot-management', label: 'Bot Management', icon: '🤖' },
        { id: 'content', label: 'Guides / Content', icon: '📖' },
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
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`admin__nav-item${activeSection === item.id ? ' admin__nav-item--active' : ''}`}
                            onClick={() => setActiveSection(item.id)}
                        >
                            <span className='admin__nav-icon'>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className='admin__sidebar-footer'>
                    <div className='admin__user'>
                        <span className='admin__user-avatar'>👤</span>
                        <span className='admin__user-name'>{adminUser.user}</span>
                    </div>
                    <button className='admin__logout' onClick={handleLogout}>
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className='admin__main'>
                <header className='admin__header'>
                    <h1 className='admin__page-title'>{navItems.find(n => n.id === activeSection)?.label}</h1>
                </header>

                <div className='admin__content'>
                    {activeSection === 'bot-management' && <BotManagementSection />}
                    {activeSection === 'content' && <ContentSection />}
                    {activeSection === 'analytics' && <AnalyticsSection />}
                    {activeSection === 'system' && <SystemStatusSection />}
                </div>
            </main>
        </div>
    );
}

function PlaceholderCard({ title, description }: { title: string; description: string }) {
    return (
        <div className='admin__placeholder-card'>
            <h3 className='admin__placeholder-title'>{title}</h3>
            <p className='admin__placeholder-desc'>{description}</p>
            <div className='admin__placeholder-badge'>Coming Soon</div>
        </div>
    );
}

function BotManagementSection() {
    return (
        <div className='admin__section-grid'>
            <PlaceholderCard title='Active Bots' description='View and manage all running trading bots.' />
            <PlaceholderCard title='Bot Templates' description='Create and edit reusable bot strategy templates.' />
            <PlaceholderCard title='Strategy Library' description='Manage the public strategy library and XML files.' />
            <PlaceholderCard title='Bot Logs' description='Inspect execution logs and error reports per bot.' />
        </div>
    );
}

function ContentSection() {
    return (
        <div className='admin__section-grid'>
            <PlaceholderCard title='Guides' description='Create and publish trading guides and tutorials.' />
            <PlaceholderCard title='Announcements' description='Manage platform announcements and banners.' />
            <PlaceholderCard title='FAQ' description='Update frequently asked questions and answers.' />
            <PlaceholderCard title='Media Library' description='Upload and manage images and video content.' />
        </div>
    );
}

function AnalyticsSection() {
    return (
        <div className='admin__section-grid'>
            <PlaceholderCard title='User Activity' description='Track active users, sessions, and engagement.' />
            <PlaceholderCard title='Trade Volume' description='Monitor aggregate trade volume and performance.' />
            <PlaceholderCard title='Bot Usage' description='See which bots are most used and their win rates.' />
            <PlaceholderCard title='Revenue' description='Revenue metrics and subscription analytics.' />
        </div>
    );
}

function SystemStatusSection() {
    return (
        <div className='admin__section-grid'>
            <PlaceholderCard title='API Health' description='Monitor Deriv API connection status and latency.' />
            <PlaceholderCard title='Service Uptime' description='Uptime history for all critical services.' />
            <PlaceholderCard title='Error Tracker' description='Recent errors and exception reports.' />
            <PlaceholderCard title='Deployments' description='Deployment history and rollback controls.' />
        </div>
    );
}
