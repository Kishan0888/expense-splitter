'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import { apiFetch } from '@/lib/api';
import { Plus, ArrowRight, CheckCircle, Receipt, Users, TrendingDown, X, ChevronLeft } from 'lucide-react';

interface Member { id: number; name: string; email: string; }
interface Expense { id: number; title: string; amount: string; paid_by: number; paid_by_name: string; created_at: string; }
interface Balance { userId: number; name: string; netBalance: number; }
interface Transaction { fromUserId: number; fromName: string; toUserId: number; toName: string; toEmail: string; amount: number; }
interface Group { id: number; name: string; description: string; members: Member[]; expenses: Expense[]; }

type Tab = 'expenses' | 'balances';

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
  const [settling, setSettling] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ title: '', amount: '', splitType: 'equal' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

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

  const settle = async (txn: Transaction) => {
    await apiFetch(`/groups/${groupId}/settle`, token, {
      method: 'POST',
      body: JSON.stringify({ toUserId: txn.toUserId, amount: txn.amount }),
    });
    setSettling(null);
    await fetchGroup();
  };

  const myBalance = balances.find(b => b.userId === user?.id);

  if (!group) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)' }}>Loading…</div>
    </div>
  );

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
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            {group.members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', borderRadius: 20, padding: '4px 10px 4px 4px', border: '1px solid var(--border)' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000' }}>
                  {m.name[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{m.id === user?.id ? 'You' : m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {myBalance && (
          <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: myBalance.netBalance >= 0 ? 'rgba(74,222,128,0.05)' : 'rgba(239,68,68,0.05)', borderColor: myBalance.netBalance >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>YOUR BALANCE</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: myBalance.netBalance >= 0 ? 'var(--green)' : '#f87171', fontFamily: 'var(--font-jetbrains)' }}>
                {myBalance.netBalance >= 0 ? '+' : ''}₹{Math.abs(myBalance.netBalance).toFixed(2)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {myBalance.netBalance > 0.01 ? 'You are owed this amount' : myBalance.netBalance < -0.01 ? 'You owe this amount' : 'All settled up'}
              </div>
            </div>
            <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add expense</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {(['expenses', 'balances'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-syne)',
              color: tab === t ? 'var(--text)' : 'var(--muted)',
              padding: '8px 16px', borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t === 'expenses' ? <Receipt size={14} /> : <TrendingDown size={14} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.expenses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '50px 24px' }}>
                <Receipt size={36} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 600 }}>No expenses yet</p>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Add the first expense to get started</p>
              </div>
            ) : group.expenses.map(exp => (
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
                  <span className="mono" style={{ fontWeight: 700, color: b.netBalance >= 0 ? 'var(--green)' : '#f87171' }}>
                    {b.netBalance >= 0 ? '+' : ''}₹{Math.abs(b.netBalance).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {transactions.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  Suggested settlements ({transactions.length} transactions)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {transactions.map((txn, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>{txn.fromUserId === user?.id ? 'You' : txn.fromName}</span>
                        <ArrowRight size={14} color="var(--muted)" />
                        <span style={{ fontWeight: 600 }}>{txn.toUserId === user?.id ? 'You' : txn.toName}</span>
                        <span className="mono" style={{ color: 'var(--green)', fontWeight: 700, marginLeft: 4 }}>₹{txn.amount.toFixed(2)}</span>
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
                  Algorithm reduced to {transactions.length} optimal transaction{transactions.length !== 1 ? 's' : ''} using debt simplification
                </p>
              </div>
            )}
            {transactions.length === 0 && balances.length > 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <CheckCircle size={36} color="var(--green)" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 700 }}>All settled up!</p>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>No outstanding balances in this group</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add expense</h2>
              <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowAdd(false)}><X size={16} /></button>
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
                  <option value="equal">Split equally ({group.members.length} people)</option>
                </select>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>You paid · Each person owes</div>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--green)', fontSize: 16, marginTop: 4 }}>
                  ₹{form.amount ? (Number(form.amount) / group.members.length).toFixed(2) : '0.00'}
                </div>
              </div>
              {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
              <button className="btn-primary" type="submit" disabled={adding} style={{ justifyContent: 'center' }}>
                {adding ? 'Adding…' : 'Add expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {settling && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <CheckCircle size={40} color="var(--green)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Confirm settlement</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
              Mark that you paid <span style={{ color: 'var(--text)', fontWeight: 600 }}>{settling.toName}</span>
            </p>
            <div className="mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)', marginBottom: 24 }}>
              ₹{settling.amount.toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSettling(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => settle(settling)}>
                Confirm
              </button>
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
