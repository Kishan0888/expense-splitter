'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import { apiFetch } from '@/lib/api';
import { Plus, ArrowRight, CheckCircle, Receipt, TrendingDown, X, ChevronLeft, UserPlus, AlertCircle } from 'lucide-react';

interface Member { id: number; name: string; email: string; }
interface Expense { id: number; title: string; amount: string; paid_by: number; paid_by_name: string; created_at: string; }
interface Balance { userId: number; name: string; netBalance: number; }
interface Transaction { fromUserId: number; fromName: string; toUserId: number; toName: string; amount: number; }
interface Group { id: number; name: string; description: string; members: Member[]; expenses: Expense[]; }

type Tab = 'expenses' | 'balances' | 'members';

function GroupPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [settling, setSettling] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ title: '', amount: '', splitType: 'equal' });
  const [memberEmail, setMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  const fetchGroup = useCallback(async () => {
    if (!token) return;
    const [g, b] = await Promise.all([
      apiFetch(`/groups/${groupId}`, token),
      apiFetch(`/groups/${groupId}/balances`, token),
    ]);
    setGroup(g);
    setBalances(b.balances);
    setTransactions(b.transactions);
  }, [token, groupId]);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);
  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setAdding(true);
    try {
      await apiFetch(`/groups/${groupId}/expenses`, token, {
        method: 'POST',
        body: JSON.stringify({ title: form.title, amount: Number(form.amount), splitType: form.splitType }),
      });
      setShowAdd(false);
      setForm({ title: '', amount: '', splitType: 'equal' });
      await fetchGroup();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally { setAdding(false); }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError(''); setMemberSuccess(''); setAddingMember(true);
    try {
      await apiFetch(`/groups/${groupId}/members`, token, {
        method: 'POST',
        body: JSON.stringify({ email: memberEmail.trim() }),
      });
      setMemberSuccess(`${memberEmail.trim()} added successfully!`);
      setMemberEmail('');
      await fetchGroup();
    } catch (err: unknown) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add member');
    } finally { setAddingMember(false); }
  };

  const settle = async (txn: Transaction) => {
    await apiFetch(`/groups/${groupId}/settle`, token, {
      method: 'POST',
      body: JSON.stringify({ toUserId: txn.toUserId, amount: txn.amount }),
    });
    setSettling(null);
    await fetchGroup();
  };

  const memberCount = group?.members?.length || 0;
  const myBalance = balances.find(b => b.userId === user?.id);
  const perPerson = form.amount && memberCount > 0
    ? (Number(form.amount) / memberCount).toFixed(2)
    : '0.00';

  if (!group) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)' }}>Loading…</div>
    </div>
  );

  const tabs: Tab[] = ['expenses', 'balances', 'members'];
  const tabIcons = { expenses: <Receipt size={14} />, balances: <TrendingDown size={14} />, members: <UserPlus size={14} /> };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 13, marginBottom: 20 }} onClick={() => router.push('/dashboard')}>
          <ChevronLeft size={14} /> Dashboard
        </button>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>{group.name}</h1>
          {group.description && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{group.description}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {group.members.map((m: Member) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', borderRadius: 20, padding: '4px 10px 4px 4px', border: '1px solid var(--border)' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000' }}>
                  {m.name[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{m.id === user?.id ? 'You' : m.name}</span>
              </div>
            ))}
            <button onClick={() => { setTab('members'); setShowAddMember(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 20, padding: '4px 10px', fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
              <Plus size={10} /> Add member
            </button>
          </div>
        </div>

        {myBalance && (
          <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: myBalance.netBalance >= 0 ? 'rgba(74,222,128,0.05)' : 'rgba(239,68,68,0.05)', borderColor: myBalance.netBalance >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>YOUR BALANCE</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: myBalance.netBalance >= 0 ? 'var(--green)' : '#f87171', fontFamily: 'var(--font-jetbrains)' }}>
                {myBalance.netBalance >= 0 ? '+' : ''}₹{Math.abs(myBalance.netBalance).toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {myBalance.netBalance > 0.01 ? 'You are owed this amount' : myBalance.netBalance < -0.01 ? 'You owe this amount' : 'All settled up'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add expense</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-syne)', color: tab === t ? 'var(--text)' : 'var(--muted)',
              padding: '8px 16px', borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {tabIcons[t]}{t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'members' && <span style={{ background: 'var(--surface2)', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>{memberCount}</span>}
            </button>
          ))}
        </div>

        {/* Expenses Tab */}
        {tab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.expenses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '50px 24px' }}>
                <Receipt size={36} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600 }}>No expenses yet</p>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4, marginBottom: 16 }}>Add the first expense to get started</p>
                <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add expense</button>
              </div>
            ) : group.expenses.map((exp: Expense) => (
              <div key={exp.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{exp.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                    Paid by <span style={{ color: 'var(--text)', fontWeight: 500 }}>{exp.paid_by === user?.id ? 'you' : exp.paid_by_name}</span>
                    {' · '}{new Date(exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 700, fontSize: 17, color: 'var(--green)' }}>
                  ₹{Number(exp.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Balances Tab */}
        {tab === 'balances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net balances</p>
              {balances.map(b => (
                <div key={b.userId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                      {b.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{b.userId === user?.id ? 'You' : b.name}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 700, color: b.netBalance >= 0 ? 'var(--green)' : '#f87171' }}>
                    {b.netBalance >= 0 ? '+' : ''}₹{Math.abs(b.netBalance).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            {transactions.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  Suggested settlements ({transactions.length} transaction{transactions.length !== 1 ? 's' : ''})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {transactions.map((txn, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>{txn.fromUserId === user?.id ? 'You' : txn.fromName}</span>
                        <ArrowRight size={14} color="var(--muted)" />
                        <span style={{ fontWeight: 600 }}>{txn.toUserId === user?.id ? 'You' : txn.toName}</span>
                        <span style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--green)', fontWeight: 700 }}>₹{txn.amount.toFixed(2)}</span>
                      </div>
                      {txn.fromUserId === user?.id && (
                        <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setSettling(txn)}>
                          <CheckCircle size={13} /> Mark settled
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                  Debt simplification reduced this to {transactions.length} optimal transaction{transactions.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            {transactions.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <CheckCircle size={36} color="var(--green)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 700 }}>All settled up!</p>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>No outstanding balances in this group</p>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {tab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {showAddMember && (
              <div className="card" style={{ borderColor: 'rgba(74,222,128,0.3)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Add a member by email</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  The person must already have a SplitEase account with that email address.
                </p>
                <form onSubmit={addMember} style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="email" placeholder="friend@example.com" value={memberEmail}
                    onChange={e => { setMemberEmail(e.target.value); setMemberError(''); setMemberSuccess(''); }} required style={{ flex: 1 }} />
                  <button className="btn-primary" type="submit" disabled={addingMember}>
                    {addingMember ? '…' : 'Add'}
                  </button>
                </form>
                {memberError && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <AlertCircle size={14} color="#f87171" />
                    <p style={{ fontSize: 13, color: '#f87171' }}>{memberError}</p>
                  </div>
                )}
                {memberSuccess && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <CheckCircle size={14} color="var(--green)" />
                    <p style={{ fontSize: 13, color: 'var(--green)' }}>{memberSuccess}</p>
                  </div>
                )}
              </div>
            )}
            {group.members.map((m: Member) => (
              <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.id === user?.id ? 'var(--green)' : 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: m.id === user?.id ? '#000' : 'var(--text)', flexShrink: 0 }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}{m.id === user?.id ? ' (you)' : ''}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.email}</div>
                </div>
              </div>
            ))}
            {!showAddMember && (
              <button className="btn-ghost" style={{ justifyContent: 'center' }} onClick={() => setShowAddMember(true)}>
                <Plus size={14} /> Add member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add expense</h2>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setShowAdd(false); setError(''); }}><X size={16} /></button>
            </div>
            <form onSubmit={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">What was it for?</label>
                <input className="input" placeholder="Hotel, dinner, fuel…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input className="input" type="number" min="1" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Split type</label>
                <select className="input" value={form.splitType} onChange={e => setForm(f => ({ ...f, splitType: e.target.value }))}>
                  <option value="equal">Split equally among {memberCount} member{memberCount !== 1 ? 's' : ''}</option>
                </select>
              </div>
              {memberCount > 0 && (
                <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Each person pays</div>
                  <div style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 700, color: 'var(--green)', fontSize: 18 }}>₹{perPerson}</div>
                </div>
              )}
              {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
              <button className="btn-primary" type="submit" disabled={adding} style={{ justifyContent: 'center' }}>
                {adding ? 'Adding…' : 'Add expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settling && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--green)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Confirm settlement</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
              Mark that you paid <span style={{ color: 'var(--text)', fontWeight: 600 }}>{settling.toName}</span>
            </p>
            <div style={{ fontFamily: 'var(--font-jetbrains)', fontSize: 32, fontWeight: 800, color: 'var(--green)', marginBottom: 24 }}>
              ₹{settling.amount.toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSettling(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => settle(settling)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GroupDetailPage() {
  return <AuthProvider><GroupPage /></AuthProvider>;
}
