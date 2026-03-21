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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          <Zap size={18} color="var(--green)" strokeWidth={2.5} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>SplitEase by Kishan</span>
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{user.name}</span>
            <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handleLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
