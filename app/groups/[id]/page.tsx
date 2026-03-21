'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import { Plus, ArrowRight, CheckCircle, Receipt, TrendingDown, X, ChevronLeft, Users, AlertCircle } from 'lucide-react';

interface Member  { id: number; name: string; email: string; }
interface Expense { id: number; title: string; amount: number; paid_by: number; paid_by_name: string; created_at: string; }
interface Balance { userId: number; name: string; netBalance: number; }
interface Txn     { fromUserId: number; fromName: string; toUserId: number; toName: string; amount: number; }
interface Group   { id: number; name: string; description: string; members: Member[]; expenses: Expense[]; }

async function api(path: string, token: string, opts?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function GroupDetail() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const gid = params.id as string;
  const tok = useRef(token);
  const timer = useRef<NodeJS.Timeout>();
  useEffect(() => { tok.current = token; }, [token]);

  const [group,   setGroup]   = useState<Group | null>(null);
  const [bals,    setBals]    = useState<Balance[]>([]);
  const [txns,    setTxns]    = useState<Txn[]>([]);
  const [tab,     setTab]     = useState<'expenses'|'balances'|'members'>('expenses');
  const [showAdd, setShowAdd] = useState(false);
  const [showMem, setShowMem] = useState(false);
  const [settle,  setSettle]  = useState<Txn|null>(null);
  const [title,   setTitle]   = useState('');
  const [amount,  setAmount]  = useState('');
  const [memEmail,setMemEmail]= useState('');
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const [memErr,  setMemErr]  = useState('');
  const [memOk,   setMemOk]   = useState('');
  const [ts,      setTs]      = useState('');

  const load = useCallback(async () => {
    if (!tok.current) return;
    try {
      const [g, b] = await Promise.all([
        api(`/groups/${gid}`, tok.current),
        api(`/groups/${gid}/balances`, tok.current),
      ]);
      setGroup(g);
      setBals(b.balances || []);
      setTxns(b.transactions || []);
      setTs(new Date().toLocaleTimeString());
    } catch { /* silent poll */ }
  }, [gid]);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    load();
    timer.current = setInterval(() => load(), 4000);
    return () => clearInterval(timer.current);
  }, [token, load]);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tok.current) return;
    setErr(''); setBusy(true);
    try {
      await api(`/groups/${gid}/expenses`, tok.current, {
        method: 'POST',
        body: JSON.stringify({ title, amount: Number(amount) }),
      });
      setShowAdd(false); setTitle(''); setAmount('');
      await load();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tok.current) return;
    setMemErr(''); setMemOk(''); setBusy(true);
    try {
      await api(`/groups/${gid}/members`, tok.current, {
        method: 'POST', body: JSON.stringify({ email: memEmail.trim() }),
      });
      setMemOk(`${memEmail.trim()} added!`); setMemEmail('');
      await load();
    } catch (e: unknown) { setMemErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const doSettle = async (t: Txn) => {
    if (!tok.current) return;
    await api(`/groups/${gid}/settle`, tok.current, {
      method: 'POST', body: JSON.stringify({ toUserId: t.toUserId, amount: t.amount }),
    });
    setSettle(null); await load();
  };

  const me = bals.find(b => b.userId === user?.id);
  const mc = group?.members.length || 0;
  const perPerson = amount && mc > 0 ? (Number(amount) / mc).toFixed(2) : '0.00';

  if (!group) return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button className="btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }} onClick={() => router.push('/dashboard')}>
            <ChevronLeft size={14} /> Dashboard
          </button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Live · {ts}</span>
        </div>

        {/* Group title + members */}
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>{group.name}</h1>
        {group.description && <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 14 }}>{group.description}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {group.members.map(m => (
            <span key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px 3px 4px', fontSize: 12, fontWeight: 500 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: m.id === user?.id ? 'var(--green)' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#000' }}>{m.name[0].toUpperCase()}</span>
              {m.id === user?.id ? 'You' : m.name}
            </span>
          ))}
          <button onClick={() => { setTab('members'); setShowMem(true); }} style={{ fontSize: 12, color: 'var(--muted)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: 20, padding: '3px 10px', cursor: 'pointer' }}>
            + Add member
          </button>
        </div>

        {/* Balance card */}
        <div className="card" style={{ marginBottom: 24, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderColor: (me?.netBalance ?? 0) > 0.01 ? 'rgba(74,222,128,0.3)' : (me?.netBalance ?? 0) < -0.01 ? 'rgba(248,113,113,0.3)' : 'var(--border)', background: (me?.netBalance ?? 0) > 0.01 ? 'rgba(74,222,128,0.04)' : (me?.netBalance ?? 0) < -0.01 ? 'rgba(248,113,113,0.04)' : 'var(--surface)' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: 6 }}>YOUR BALANCE</p>
            <p style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-jetbrains)', color: (me?.netBalance ?? 0) > 0.01 ? 'var(--green)' : (me?.netBalance ?? 0) < -0.01 ? '#f87171' : 'var(--muted)' }}>
              {(me?.netBalance ?? 0) > 0 ? '+' : ''}₹{Math.abs(me?.netBalance ?? 0).toFixed(2)}
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {(me?.netBalance ?? 0) > 0.01 ? '✓ You are owed this amount' : (me?.netBalance ?? 0) < -0.01 ? '↑ You owe this amount' : '✓ All settled up'}
            </p>
          </div>
          <button className="btn-primary" style={{ padding: '12px 22px', fontSize: 15 }} onClick={() => { setShowAdd(true); setErr(''); }}>
            <Plus size={16} /> Add expense
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 0 }}>
          {(['expenses','balances','members'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent', marginBottom: -1, padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-syne)', color: tab === t ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {t === 'expenses' && <Receipt size={13} />}
              {t === 'balances' && <TrendingDown size={13} />}
              {t === 'members'  && <Users size={13} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'expenses' && group.expenses.length > 0 && <span style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--green)', fontSize: 10, borderRadius: 10, padding: '1px 6px' }}>{group.expenses.length}</span>}
              {t === 'members' && <span style={{ background: 'var(--surface2)', fontSize: 10, borderRadius: 10, padding: '1px 6px', color: 'var(--muted)' }}>{mc}</span>}
            </button>
          ))}
        </div>

        {/* EXPENSES TAB */}
        {tab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.expenses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
                <Receipt size={40} color="var(--muted)" style={{ margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No expenses yet</p>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Be the first to add one</p>
                <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} /> Add expense</button>
              </div>
            ) : group.expenses.map(exp => (
              <div key={exp.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.3s ease' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15 }}>{exp.title}</p>
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>
                    Paid by <strong style={{ color: 'var(--text)' }}>{exp.paid_by === user?.id ? 'you' : exp.paid_by_name}</strong>
                    {' · '}{new Date(exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 800, fontSize: 18, color: 'var(--green)' }}>₹{exp.amount.toFixed(2)}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>₹{(exp.amount / mc).toFixed(2)} each</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BALANCES TAB */}
        {tab === 'balances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bals.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>Add an expense first to see balances</div>
            ) : (
              <>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Net balances</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bals.map(b => (
                      <div key={b.userId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.userId === user?.id ? 'var(--green)' : 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: b.userId === user?.id ? '#000' : 'var(--text)' }}>
                            {b.name[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{b.userId === user?.id ? 'You' : b.name}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 800, fontSize: 16, color: b.netBalance > 0 ? 'var(--green)' : b.netBalance < 0 ? '#f87171' : 'var(--muted)' }}>
                          {b.netBalance > 0 ? '+' : ''}₹{Math.abs(b.netBalance).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {txns.length > 0 ? (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                      Suggested settlements ({txns.length} optimal transaction{txns.length !== 1 ? 's' : ''})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {txns.map((t, i) => (
                        <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700 }}>{t.fromUserId === user?.id ? 'You' : t.fromName}</span>
                            <ArrowRight size={14} color="var(--muted)" />
                            <span style={{ fontWeight: 700 }}>{t.toUserId === user?.id ? 'You' : t.toName}</span>
                            <span style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--green)', fontWeight: 800 }}>₹{t.amount.toFixed(2)}</span>
                          </div>
                          {t.fromUserId === user?.id && (
                            <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => setSettle(t)}>
                              <CheckCircle size={13} /> Mark paid
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <CheckCircle size={36} color="var(--green)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 700 }}>All settled up!</p>
                    <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>No outstanding balances</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {tab === 'members' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {showMem && (
              <div className="card" style={{ borderColor: 'rgba(74,222,128,0.3)', marginBottom: 4 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Add member by email</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>They must have a SplitEase account already.</p>
                <form onSubmit={addMember} style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="email" placeholder="friend@example.com" value={memEmail}
                    onChange={e => { setMemEmail(e.target.value); setMemErr(''); setMemOk(''); }} required style={{ flex: 1 }} />
                  <button className="btn-primary" type="submit" disabled={busy}>{busy ? '…' : 'Add'}</button>
                </form>
                {memErr && <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}><AlertCircle size={14} color="#f87171" /><span style={{ fontSize: 13, color: '#f87171' }}>{memErr}</span></div>}
                {memOk  && <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}><CheckCircle size={14} color="var(--green)" /><span style={{ fontSize: 13, color: 'var(--green)' }}>{memOk}</span></div>}
              </div>
            )}
            {group.members.map(m => (
              <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: m.id === user?.id ? 'var(--green)' : 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: m.id === user?.id ? '#000' : 'var(--text)', flexShrink: 0 }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 600 }}>{m.name}{m.id === user?.id ? ' (you)' : ''}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.email}</p>
                </div>
              </div>
            ))}
            {!showMem && (
              <button className="btn-ghost" style={{ justifyContent: 'center', marginTop: 4 }} onClick={() => setShowMem(true)}>
                <Plus size={14} /> Add member
              </button>
            )}
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20 }}>Add expense</h2>
              <button className="btn-ghost" style={{ padding: '5px 9px' }} onClick={() => { setShowAdd(false); setErr(''); }}><X size={16} /></button>
            </div>
            <form onSubmit={addExpense} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">What was it for?</label>
                <input className="input" placeholder="Dinner, hotel, fuel…" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
              </div>
              <div>
                <label className="label">Total amount (₹)</label>
                <input className="input" type="number" min="1" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Split equally among {mc} people</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Each person pays</p>
                </div>
                <p style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 800, fontSize: 22, color: 'var(--green)' }}>₹{perPerson}</p>
              </div>
              {err && <p style={{ color: '#f87171', fontSize: 13 }}>{err}</p>}
              <button className="btn-primary" type="submit" disabled={busy} style={{ justifyContent: 'center', padding: '13px', fontSize: 15 }}>
                {busy ? 'Adding…' : 'Add expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SETTLE MODAL */}
      {settle && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: 360, textAlign: 'center', padding: '36px 28px' }}>
            <CheckCircle size={44} color="var(--green)" style={{ margin: '0 auto 18px' }} />
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Confirm payment</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 6 }}>You are paying</p>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{settle.toName}</p>
            <p style={{ fontFamily: 'var(--font-jetbrains)', fontWeight: 800, fontSize: 36, color: 'var(--green)', margin: '16px 0 28px' }}>₹{settle.amount.toFixed(2)}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSettle(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => doSettle(settle)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <AuthProvider><GroupDetail /></AuthProvider>;
}
