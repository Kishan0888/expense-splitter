'use client';
import { useEffect, useState } from 'react';
import NotificationButton from '@/components/NotificationButton';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import { apiFetch } from '@/lib/api';
import { Plus, Users, Receipt, ChevronRight, X, AlertCircle } from 'lucide-react';

interface Group { id: number; name: string; description: string; member_count: number; expense_count: number; created_at: string; }

function Dashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', memberEmails: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch('/groups', token).then(setGroups).catch(() => {}).finally(() => setFetching(false));
  }, [token]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setWarning(''); setCreating(true);
    try {
      const emails = form.memberEmails.split(',').map(e => e.trim()).filter(Boolean);
      const g = await apiFetch('/groups', token, {
        method: 'POST',
        body: JSON.stringify({ name: form.name, description: form.description, memberEmails: emails }),
      });

      // Show warning if some emails weren't found
      if (g.notFound?.length > 0) {
        setWarning(`Group created! But these emails are not registered yet — ask them to sign up first: ${g.notFound.join(', ')}`);
      } else {
        setShowCreate(false);
      }

      // Refresh groups list
      const added = emails.length - (g.notFound?.length || 0);
      setGroups(prev => [{ ...g, member_count: 1 + added, expense_count: 0 }, ...prev]);
      setForm({ name: '', description: '', memberEmails: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally { setCreating(false); }
  };

  if (loading || !user) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Your groups</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Manage shared expenses across your groups</p>
          </div>
          <button className="btn-primary" onClick={() => { setShowCreate(true); setWarning(''); setError(''); }}>
            <Plus size={16} /> New group
          </button>
        </div>

        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
            <div className="card animate-in" style={{ width: '100%', maxWidth: 460 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Create group</h2>
                <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setShowCreate(false); setWarning(''); setError(''); }}><X size={16} /></button>
              </div>

              {warning ? (
                <div>
                  <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
                    <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: '#fbbf24', lineHeight: 1.6 }}>{warning}</p>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    You can still add them later once they register — just share your group invite link or ask them to create an account with the same email.
                  </p>
                  <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
                    Got it, close
                  </button>
                </div>
              ) : (
                <form onSubmit={createGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="label">Group name</label>
                    <input className="input" placeholder="Goa Trip 2025" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Description (optional)</label>
                    <input className="input" placeholder="Beach vacation with the squad" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Invite members (comma-separated emails)</label>
                    <input className="input" placeholder="priya@ex.com, rahul@ex.com" value={form.memberEmails} onChange={e => setForm(f => ({ ...f, memberEmails: e.target.value }))} />
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                      Members must already have a SplitEase account. Ask them to register first.
                    </p>
                  </div>
                  {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
                  <button className="btn-primary" type="submit" disabled={creating} style={{ justifyContent: 'center' }}>
                    {creating ? 'Creating…' : 'Create group'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {fetching ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 60 }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Users size={40} color="var(--muted)" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700, marginBottom: 8 }}>No groups yet</p>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Create your first group to start splitting expenses</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create a group</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {groups.map(g => (
              <div key={g.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', alignItems: 'center', gap: 16 }}
                onClick={() => router.push(`/groups/${g.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#444')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(74,222,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={18} color="var(--green)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{g.name}</div>
                  {g.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{g.description}</div>}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.member_count} member{g.member_count !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.expense_count} expense{g.expense_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--muted)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <AuthProvider><Dashboard /></AuthProvider>;
}
