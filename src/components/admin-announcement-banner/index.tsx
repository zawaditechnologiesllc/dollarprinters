import { useEffect, useState } from 'react';
import './admin-announcement-banner.scss';

interface AdminAnnouncement {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    active: boolean;
    createdAt: string;
}

const DISMISSED_KEY = 'dp-dismissed-announcements';

function getDismissed(): Set<string> {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function dismiss(id: string) {
    const set = getDismissed();
    set.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
}

export default function AdminAnnouncementBanner() {
    const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

    useEffect(() => {
        fetch('/announcements.json', { cache: 'no-store' })
            .then(r => r.ok ? r.json() : [])
            .then((data: AdminAnnouncement[]) => {
                if (Array.isArray(data)) {
                    setAnnouncements(data.filter(a => a.active));
                }
            })
            .catch(() => {});
    }, []);

    const visible = announcements.filter(a => !dismissed.has(a.id));
    if (visible.length === 0) return null;

    const handleDismiss = (id: string) => {
        dismiss(id);
        setDismissed(new Set(getDismissed()));
    };

    return (
        <div className='admin-banners'>
            {visible.map(a => (
                <div key={a.id} className={`admin-banners__item admin-banners__item--${a.type}`}>
                    <div className='admin-banners__icon'>
                        {a.type === 'info' && '💡'}
                        {a.type === 'warning' && '⚠️'}
                        {a.type === 'success' && '✅'}
                    </div>
                    <div className='admin-banners__body'>
                        <strong className='admin-banners__title'>{a.title}</strong>
                        <span className='admin-banners__message'>{a.message}</span>
                    </div>
                    <button
                        className='admin-banners__close'
                        onClick={() => handleDismiss(a.id)}
                        aria-label='Dismiss'
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
