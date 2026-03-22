'use client';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, Zap, Bell, BellOff } from 'lucide-react';
import { useState, useEffect } from 'react';

function NotifyBtn({ token }: { token: string | null }) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    );
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ endpoint: sub.endpoint }) });
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { alert('Please allow notifications in your browser settings.'); setLoading(false); return; }
        const keyRes = await fetch('/api/push-key');
        const { publicKey } = await keyRes.json();
        const keyBytes = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes });
        await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(sub.toJSON()) });
        setSubscribed(true);
        // Test notification
        new Notification('SplitEase 🔔', { body: 'Notifications enabled! You will be notified of new expenses.', icon: '/icon-192.svg' });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={toggle} disabled={loading} title={subscribed ? 'Disable notifications' : 'Enable notifications'}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
        border: `1px solid ${subscribed ? 'rgba(34,197,94,0.5)' : 'var(--border)'}`,
        background: subscribed ? 'rgba(34,197,94,0.1)' : 'transparent',
        color: subscribed ? 'var(--green)' : 'var(--muted)', cursor: 'pointer',
        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
      {loading ? '...' : subscribed ? <><Bell size={12} /> Notifs on</> : <><BellOff size={12} /> Notify me</>}
    </button>
  );
}

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const handleLogout = () => { logout(); router.push('/'); };

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }} onClick={() => router.push('/dashboard')}>
          <Zap size={16} color="var(--green)" strokeWidth={2.5} />
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>SplitEase by Kishan</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
            <NotifyBtn token={token} />
            <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }} onClick={handleLogout}>
              <LogOut size={13} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
