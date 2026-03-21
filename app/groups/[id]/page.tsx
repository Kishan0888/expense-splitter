'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthContext';
import Navbar from '@/components/Navbar';
import { Plus, ArrowRight, CheckCircle, Receipt, TrendingDown, X, ChevronLeft, Users, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface Member  { id: number; name: string; email: string; }
interface Expense { id: number; title: string; amount: number; paid_by: number; paid_by_name: string; created_at: string; }
interface Balance { userId: number; name: string; netBalance: number; }
interface Txn     { fromUserId: number; fromName: string; toUserId: number; toName: string; amount: number; }
interface Group   { id: number; name: string; description: string; members: Member[]; expenses: Expense[]; }

function GroupDetail() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const gid = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [group,    setGroup]   = useState<Group | null>(null);
  const [balances, setBalances]= useState<Balance[]>([]);
  const [txns,     setTxns]   = useState<Txn[]>([]);
  const [tab,      setTab]    = useState<'expenses'|'balances'|'members'>('expenses');
  const [showAdd,  setShowAdd]= useState(false);
  const [showMem,  setShowMem]= useState(false);
  const [settling, setSettling]= useState<Txn|null>(null);
  const [expTitle, setExpTitle]= useState('');
  const [expAmt,   setExpAmt] = useState('');
  const [memEmail, setMemEmail]= useState('');
  const [busy,     setBusy]   = useState(false);
  const [err,      setErr]    = useState('');
  const [memErr,   setMemErr] = useState('');
  const [memOk,    setMemOk]  = useState('');
  const [syncing,  setSyncing]= useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting,  setDeleting] = useState(false);
  const [lastSync, setLastSync]= useState('');
  const pollTimer = useRef<NodeJS.Timeout|null>(null);

  // Core fetch function — always uses latest token from localStorage
  async function fetchData() {
    const tok = localStorage.getItem('token');
    if (!tok) return;
    setSyncing(true);
    try {
      const [gRes, bRes] = await Promise.all([
        fetch(`/api/groups/${gid}?t=${Date.now()}`, { headers: { Authorization: `Bearer ${tok}`, 'Cache-Control': 'no-cache' } }),
        fetch(`/api/groups/${gid}/balances?t=${Date.now()}`, { headers: { Authorization: `Bearer ${tok}`, 'Cache-Control': 'no-cache' } }),
      ]);
      if (!gRes.ok || !bRes.ok) {
        console.error('Fetch failed', gRes.status, bRes.status);
        return;
      }
      const gData = await gRes.json();
      const bData = await bRes.json();

      setGroup({
        id: gData.id,
        name: gData.name,
        description: gData.description || '',
        members: Array.isArray(gData.members) ? gData.members : [],
        expenses: Array.isArray(gData.expenses) ? gData.expenses : [],
      });
      setBalances(Array.isArray(bData.balances) ? bData.balances : []);
      setTxns(Array.isArray(bData.transactions) ? bData.transactions : []);
      setLastSync(new Date().toLocaleTimeString());
    } catch(e) {
      console.error('fetchData error', e);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && user) {
      fetchData();
      pollTimer.current = setInterval(fetchData, 5000);
    }
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, gid]);

  async function postJSON(path: string, body: object) {
    const tok = localStorage.getItem('token')!;
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  }

  async function handleAddExpense() {
    if (!expTitle.trim() || !expAmt || Number(expAmt) <= 0) {
      setErr('Please fill in title and amount');
      return;
    }
    setErr(''); setBusy(true);
    try {
      const tok = localStorage.getItem('token')!;
      const res = await fetch(`/api/groups/${gid}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ title: expTitle.trim(), amount: Number(expAmt) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');
      setShowAdd(false); setExpTitle(''); setExpAmt('');
      await fetchData();
    } catch(e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setMemErr(''); setMemOk(''); setBusy(true);
    try {
      await postJSON(`/groups/${gid}/members`, { email: memEmail.trim() });
      setMemOk(`${memEmail} added successfully!`); setMemEmail('');
      await fetchData();
    } catch(e: unknown) { setMemErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function doSettle(t: Txn) {
    await postJSON(`/groups/${gid}/settle`, { toUserId: t.toUserId, amount: t.amount });
    setSettling(null);
    await fetchData();
  }

  async function deleteGroup() {
    setDeleting(true);
    try {
      const tok = localStorage.getItem('token')!;
      const res = await fetch(`/api/groups/${gid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tok}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete group');
      router.push('/dashboard');
    } catch(e: unknown) { alert(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setDeleting(false); setShowDelete(false); }
  }

  const mc = group?.members.length ?? 0;
  const me = balances.find(b => b.userId === user?.id);
  const perPerson = expAmt && mc > 0 ? (Number(expAmt) / mc).toFixed(2) : '0.00';

  if (!group) return (
    <div style={{ minHeight:'100vh' }}>
      <Navbar />
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'70vh', gap:14 }}>
        <div style={{ width:32, height:32, border:'3px solid var(--green)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
        <p style={{ color:'var(--muted)', fontSize:14 }}>Loading group…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const myBal = me?.netBalance ?? 0;
  const balColor = myBal > 0.01 ? 'var(--green)' : myBal < -0.01 ? '#f87171' : 'var(--muted)';

  return (
    <div style={{ minHeight:'100vh' }}>
      <Navbar />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ maxWidth:820, margin:'0 auto', padding:'16px 14px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
          <button className="btn-ghost" style={{ fontSize:12, padding:'5px 10px' }} onClick={() => router.push('/dashboard')}>
            <ChevronLeft size={13}/> Dashboard
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            {syncing
              ? <RefreshCw size={12} color="var(--green)" style={{ animation:'spin 0.8s linear infinite' }}/>
              : <span style={{ fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }}>Updated {lastSync}</span>
            }
            <button className="btn-ghost" style={{ padding:'4px 8px', fontSize:11, whiteSpace:'nowrap' }} onClick={fetchData}>
              <RefreshCw size={11}/> Refresh
            </button>
            <button onClick={() => setShowDelete(true)}
              style={{ padding:'4px 8px', fontSize:11, background:'transparent', border:'1px solid rgba(239,68,68,0.4)', borderRadius:8, color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
              <Trash2 size={11}/> Delete
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize:'clamp(22px, 6vw, 30px)', fontWeight:800, letterSpacing:'-0.5px', marginBottom:8 }}>{group.name}</h1>
        {group.description && <p style={{ color:'var(--muted)', fontSize:14, marginBottom:14 }}>{group.description}</p>}

        {/* Members row */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24, alignItems:'center' }}>
          {group.members.map(m => (
            <span key={m.id} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:20, padding:'3px 10px 3px 4px', fontSize:12, fontWeight:500 }}>
              <span style={{ width:18, height:18, borderRadius:'50%', background: m.id===user?.id ? 'var(--green)' : '#555', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#000' }}>
                {m.name[0].toUpperCase()}
              </span>
              {m.id === user?.id ? 'You' : m.name}
            </span>
          ))}
          <button onClick={() => { setTab('members'); setShowMem(true); }}
            style={{ fontSize:12, color:'var(--muted)', background:'transparent', border:'1px dashed var(--border)', borderRadius:20, padding:'3px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
            <Plus size={10}/> Add member
          </button>
        </div>

        {/* Balance card */}
        <div className="card" style={{ marginBottom:16, padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12,
          borderColor: myBal > 0.01 ? 'rgba(74,222,128,0.35)' : myBal < -0.01 ? 'rgba(248,113,113,0.35)' : 'var(--border)',
          background:  myBal > 0.01 ? 'rgba(74,222,128,0.05)' : myBal < -0.01 ? 'rgba(248,113,113,0.05)' : 'var(--surface)',
        }}>
          <div>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--muted)', letterSpacing:'0.5px', marginBottom:6 }}>YOUR BALANCE</p>
            <p style={{ fontSize:'clamp(22px, 6vw, 30px)', fontWeight:800, fontFamily:'var(--font-jetbrains)', color:balColor }}>
              {myBal > 0 ? '+' : ''}₹{Math.abs(myBal).toFixed(2)}
            </p>
            <p style={{ fontSize:13, color:'var(--muted)', marginTop:5 }}>
              {myBal > 0.01 ? '✓ You are owed this amount' : myBal < -0.01 ? '↑ You owe this amount' : '✓ All settled up'}
            </p>
          </div>
          <button className="btn-primary" style={{ padding:'12px 22px', fontSize:15 }} onClick={() => { setShowAdd(true); setErr(''); }}>
            <Plus size={16}/> Add expense
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:20 }}>
          {(['expenses','balances','members'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-syne)',
              fontSize:13, fontWeight:600, padding:'10px 18px',
              color: tab===t ? 'var(--text)' : 'var(--muted)',
              borderBottom: tab===t ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom:-1, transition:'color 0.15s',
              display:'flex', alignItems:'center', gap:6,
            }}>
              {t==='expenses' && <Receipt size={13}/>}
              {t==='balances' && <TrendingDown size={13}/>}
              {t==='members'  && <Users size={13}/>}
              {t.charAt(0).toUpperCase()+t.slice(1)}
              {t==='expenses' && group.expenses.length>0 && (
                <span style={{ background:'rgba(74,222,128,0.15)', color:'var(--green)', fontSize:10, borderRadius:10, padding:'1px 7px' }}>{group.expenses.length}</span>
              )}
              {t==='members' && (
                <span style={{ background:'var(--surface2)', color:'var(--muted)', fontSize:10, borderRadius:10, padding:'1px 7px' }}>{mc}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── EXPENSES TAB ── */}
        {tab==='expenses' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {group.expenses.length===0
              ? (
                <div className="card" style={{ textAlign:'center', padding:'60px 24px' }}>
                  <Receipt size={40} color="var(--muted)" style={{ margin:'0 auto 16px' }}/>
                  <p style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>No expenses yet</p>
                  <p style={{ color:'var(--muted)', fontSize:14, marginBottom:20 }}>Add the first expense to get started</p>
                  <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={15}/> Add expense</button>
                </div>
              )
              : group.expenses.map(exp => (
                <div key={exp.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', animation:'fadeIn 0.3s ease' }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:15 }}>{exp.title}</p>
                    <p style={{ color:'var(--muted)', fontSize:13, marginTop:3 }}>
                      Paid by <strong style={{ color:'var(--text)' }}>{exp.paid_by===user?.id ? 'you' : exp.paid_by_name}</strong>
                      {' · '}{new Date(exp.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontFamily:'var(--font-jetbrains)', fontWeight:800, fontSize:18, color:'var(--green)' }}>₹{Number(exp.amount).toFixed(2)}</p>
                    {mc>0 && <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>₹{(Number(exp.amount)/mc).toFixed(2)} each</p>}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── BALANCES TAB ── */}
        {tab==='balances' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {balances.length===0
              ? <div className="card" style={{ textAlign:'center', padding:40, color:'var(--muted)', fontSize:14 }}>Add an expense first to see balances</div>
              : <>
                  <div>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Net balances</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {balances.map(b => (
                        <div key={b.userId} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:'50%', background: b.userId===user?.id ? 'var(--green)' : 'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color: b.userId===user?.id ? '#000' : 'var(--text)' }}>
                              {b.name[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight:600 }}>{b.userId===user?.id ? 'You' : b.name}</span>
                          </div>
                          <span style={{ fontFamily:'var(--font-jetbrains)', fontWeight:800, fontSize:16, color: b.netBalance>0 ? 'var(--green)' : b.netBalance<0 ? '#f87171' : 'var(--muted)' }}>
                            {b.netBalance>0?'+':''}₹{Math.abs(b.netBalance).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {txns.length>0
                    ? <div>
                        <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
                          Suggested settlements — {txns.length} optimal transaction{txns.length!==1?'s':''}
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {txns.map((t,i) => (
                            <div key={i} className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                                <span style={{ fontWeight:700 }}>{t.fromUserId===user?.id ? 'You' : t.fromName}</span>
                                <ArrowRight size={14} color="var(--muted)"/>
                                <span style={{ fontWeight:700 }}>{t.toUserId===user?.id ? 'You' : t.toName}</span>
                                <span style={{ fontFamily:'var(--font-jetbrains)', color:'var(--green)', fontWeight:800 }}>₹{t.amount.toFixed(2)}</span>
                              </div>
                              {t.fromUserId===user?.id && (
                                <button className="btn-primary" style={{ padding:'7px 14px', fontSize:12 }} onClick={() => setSettling(t)}>
                                  <CheckCircle size={13}/> Mark paid
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    : <div className="card" style={{ textAlign:'center', padding:'36px 24px' }}>
                        <CheckCircle size={36} color="var(--green)" style={{ margin:'0 auto 12px' }}/>
                        <p style={{ fontWeight:700 }}>All settled up!</p>
                        <p style={{ color:'var(--muted)', fontSize:13, marginTop:6 }}>No outstanding balances in this group</p>
                      </div>
                  }
                </>
            }
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab==='members' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {showMem && (
              <div className="card" style={{ borderColor:'rgba(74,222,128,0.3)', marginBottom:4 }}>
                <p style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>Add member by email</p>
                <p style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>They must already have a SplitEase account.</p>
                <form onSubmit={addMember} style={{ display:'flex', gap:10 }}>
                  <input className="input" type="email" placeholder="friend@example.com" value={memEmail}
                    onChange={e => { setMemEmail(e.target.value); setMemErr(''); setMemOk(''); }} required style={{ flex:1 }}/>
                  <button className="btn-primary" type="submit" disabled={busy}>{busy?'…':'Add'}</button>
                </form>
                {memErr && <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:10 }}><AlertCircle size={14} color="#f87171"/><span style={{ fontSize:13, color:'#f87171' }}>{memErr}</span></div>}
                {memOk  && <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:10 }}><CheckCircle size={14} color="var(--green)"/><span style={{ fontSize:13, color:'var(--green)' }}>{memOk}</span></div>}
              </div>
            )}
            {group.members.map(m => (
              <div key={m.id} className="card" style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background: m.id===user?.id ? 'var(--green)' : 'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color: m.id===user?.id ? '#000' : 'var(--text)', flexShrink:0 }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight:600 }}>{m.name}{m.id===user?.id?' (you)':''}</p>
                  <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{m.email}</p>
                </div>
              </div>
            ))}
            {!showMem && (
              <button className="btn-ghost" style={{ justifyContent:'center', marginTop:4 }} onClick={() => setShowMem(true)}>
                <Plus size={14}/> Add member
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── ADD EXPENSE MODAL ── */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
          <div className="card animate-in" style={{ width:'100%', maxWidth:420 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h2 style={{ fontWeight:800, fontSize:20 }}>Add expense</h2>
              <button className="btn-ghost" style={{ padding:'5px 9px' }} onClick={() => { setShowAdd(false); setErr(''); }}><X size={16}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label className="label">What was it for?</label>
                <input className="input" placeholder="Dinner, hotel, fuel…" value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter' && expTitle && expAmt) handleAddExpense(); }}
                  autoFocus/>
              </div>
              <div>
                <label className="label">Total amount (₹)</label>
                <input className="input" type="number" min="1" step="0.01" placeholder="0.00" value={expAmt}
                  onChange={e => setExpAmt(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter' && expTitle && expAmt) handleAddExpense(); }}/>
              </div>
              <div style={{ background:'var(--surface2)', borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:12, color:'var(--muted)' }}>Split equally among {mc} member{mc!==1?'s':''}</p>
                  <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Each person pays</p>
                </div>
                <p style={{ fontFamily:'var(--font-jetbrains)', fontWeight:800, fontSize:24, color:'var(--green)' }}>₹{perPerson}</p>
              </div>
              {err && <p style={{ color:'#f87171', fontSize:13 }}>{err}</p>}
              <button className="btn-primary" disabled={busy || !expTitle || !expAmt}
                onClick={handleAddExpense}
                style={{ justifyContent:'center', padding:'13px', fontSize:15 }}>
                {busy ? 'Adding…' : 'Add expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTLE MODAL ── */}
      {settling && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
          <div className="card animate-in" style={{ width:'100%', maxWidth:360, textAlign:'center', padding:'36px 28px' }}>
            <CheckCircle size={44} color="var(--green)" style={{ margin:'0 auto 18px' }}/>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>Confirm payment</h2>
            <p style={{ color:'var(--muted)', fontSize:14, marginBottom:6 }}>You paid</p>
            <p style={{ fontWeight:700, fontSize:17, marginBottom:4 }}>{settling.toName}</p>
            <p style={{ fontFamily:'var(--font-jetbrains)', fontWeight:800, fontSize:38, color:'var(--green)', margin:'16px 0 28px' }}>₹{settling.amount.toFixed(2)}</p>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setSettling(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={() => doSettle(settling)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      {/* DELETE GROUP MODAL */}
      {showDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:20 }}>
          <div className="card animate-in" style={{ width:'100%', maxWidth:360, textAlign:'center', padding:'36px 28px' }}>
            <Trash2 size={44} color="#f87171" style={{ margin:'0 auto 18px' }}/>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:10 }}>Delete group?</h2>
            <p style={{ color:'var(--muted)', fontSize:14, marginBottom:6 }}>
              This will permanently delete <strong style={{ color:'var(--text)' }}>{group?.name}</strong> and all its expenses.
            </p>
            <p style={{ color:'#f87171', fontSize:13, marginBottom:24 }}>This action cannot be undone.</p>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setShowDelete(false)}>Cancel</button>
              <button disabled={deleting} onClick={deleteGroup}
                style={{ flex:1, justifyContent:'center', background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'10px', fontFamily:'var(--font-syne)', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
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
