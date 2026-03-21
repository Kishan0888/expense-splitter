'use client';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, Zap } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
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
            <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }} onClick={handleLogout}>
              <LogOut size={13} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
