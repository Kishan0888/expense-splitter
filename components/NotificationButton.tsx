'use client';
import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationButton({ token }: { token: string | null }) {
  const [status, setStatus] = useState<'unsupported' | 'default' | 'granted' | 'denied' | 'loading'>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return;
    }
    setStatus(Notification.permission as 'default' | 'granted' | 'denied');
    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(!!sub);
        if (sub) setStatus('granted');
      });
    });
  }, []);

  const subscribe = async () => {
    if (!token) return;
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      // Get VAPID public key
      const keyRes = await fetch('/api/push-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error('VAPID key not configured');

      // Convert base64url to Uint8Array
      const keyBytes = Uint8Array.from(
        atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes,
      });

      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sub.toJSON()),
      });

      setSubscribed(true);
      setStatus('granted');
    } catch (e) {
      console.error('Subscribe failed:', e);
      setStatus(Notification.permission as 'default' | 'granted' | 'denied');
    }
  };

  const unsubscribe = async () => {
    if (!token) return;
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setStatus('default');
    } catch (e) {
      console.error('Unsubscribe failed:', e);
      setStatus('granted');
    }
  };

  if (status === 'unsupported') return null;
  if (status === 'denied') return (
    <span style={{ fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
      <BellOff size={12} /> Notifications blocked
    </span>
  );

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={status === 'loading'}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 8, border: '1px solid',
        borderColor: subscribed ? 'rgba(34,197,94,0.4)' : 'var(--border2)',
        background: subscribed ? 'rgba(34,197,94,0.08)' : 'transparent',
        color: subscribed ? 'var(--green)' : 'var(--muted)',
        cursor: status === 'loading' ? 'wait' : 'pointer',
        fontSize: 12, fontFamily: 'var(--font)', fontWeight: 500,
        transition: 'all 0.15s',
      }}
      title={subscribed ? 'Click to turn off notifications' : 'Get notified when expenses are added'}
    >
      {subscribed ? <Bell size={13} /> : <BellOff size={13} />}
      {status === 'loading' ? '…' : subscribed ? 'Notifications on' : 'Enable notifications'}
    </button>
  );
}
