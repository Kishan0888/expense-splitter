'use client';
import { useRouter } from 'next/navigation';
import { Zap, Users, TrendingDown, Bell } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} color="var(--green)" strokeWidth={2.5} />
          <span style={{ fontWeight: 800, fontSize: 16 }}>SplitEase by Kishan</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-ghost" onClick={() => router.push('/login')}>Login</button>
          <button className="btn-primary" onClick={() => router.push('/register')}>Get started</button>
        </div>
      </nav>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: '100px 24px 60px', textAlign: 'center' }}>
        <div className="animate-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 32 }}>
            <Zap size={12} color="var(--green)" />
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Debt simplification algorithm</span>
          </div>
          <h1 style={{ fontSize: 'clamp(42px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 24 }}>
            Split bills.<br /><span style={{ color: 'var(--green)' }}>Not friendships.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>
            Group expense splitting with a smart algorithm that reduces settlement transactions by up to 60%. No more IOUs.
          </p>
          <button className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }} onClick={() => router.push('/register')}>
            Start splitting for free
          </button>
        </div>
      </section>

      <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { icon: <Users size={20} color="var(--green)" />, title: 'Group management', desc: 'Create groups for trips, flatmates, or events. Add members by email.' },
          { icon: <TrendingDown size={20} color="var(--green)" />, title: 'Debt simplification', desc: 'Our algorithm reduces N*(N-1) transactions down to at most N-1.' },
          { icon: <Bell size={20} color="var(--green)" />, title: 'Email alerts', desc: 'Every member gets notified instantly when a new expense is added.' },
          { icon: <Zap size={20} color="var(--green)" />, title: 'One-click settle', desc: 'Mark debts as settled and the balances update automatically.' },
        ].map((f, i) => (
          <div key={i} className="card animate-in" style={{ animationDelay: `${i * 80}ms` }}>
            <div style={{ marginBottom: 12 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
