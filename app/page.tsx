'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screen, setScreen] = useState('dashboard');
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', city: '', notes: '', status: 'פעיל' });
  const [newJob, setNewJob] = useState({ date: '', type: '', description: '', price: '', status: 'בביצוע', notes: '' });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (user) loadCustomers();
  }, [user]);

  const loadCustomers = async () => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data(), jobs: [] })));
  };

  const login = async () => {
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (e) { alert('פרטים שגויים'); }
  };

  const logout = () => signOut(auth);

  const saveCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return alert('שם וטלפון חובה');
    setLoading(true);
    await addDoc(collection(db, 'customers'), { ...newCustomer, createdAt: new Date().toISOString() });
    setNewCustomer({ name: '', phone: '', address: '', city: '', notes: '', status: 'פעיל' });
    await loadCustomers();
    setScreen('customers');
    setLoading(false);
  };

  const saveJob = async () => {
    if (!newJob.type) return alert('סוג עבודה חובה');
    setLoading(true);
    await addDoc(collection(db, `customers/${selectedCustomer.id}/jobs`), { ...newJob, createdAt: new Date().toISOString() });
    setNewJob({ date: '', type: '', description: '', price: '', status: 'בביצוע', notes: '' });
    setScreen('customer');
    setLoading(false);
  };

  const filtered = customers.filter(c =>
    c.name?.includes(search) || c.phone?.includes(search) || c.address?.includes(search)
  );

  const s: any = {
    app: { fontFamily: 'Arial', direction: 'rtl', maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: '#F8FAFC' },
    topbar: { background: '#2563EB', color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 },
    card: { background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9' },
    btn: { background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: 8 },
    input: { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' as any, fontFamily: 'Arial' },
    label: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
    nav: { position: 'fixed' as any, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 500, background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex' },
    navBtn: (active: boolean) => ({ flex: 1, padding: '10px 0 8px', border: 'none', background: 'none', cursor: 'pointer', color: active ? '#2563EB' : '#94A3B8', fontWeight: active ? 700 : 500, fontSize: 12 }),
  };

  if (!user) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1E3A5F, #2563EB)' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '90%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>ElectroPro</div>
        </div>
        <label style={s.label}>אימייל</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        <label style={s.label}>סיסמה</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
        <button style={s.btn} onClick={login}>כניסה</button>
      </div>
    </div>
  );

  return (
    <div style={s.app}>
      <div style={s.topbar}>
        <span>⚡ ElectroPro</span>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>יציאה</button>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>
        {screen === 'dashboard' && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>שלום! 👋</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ ...s.card, background: '#EFF6FF' }}>
                <div style={{ fontSize: 28 }}>👥</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB' }}>{customers.length}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>לקוחות</div>
              </div>
              <div style={{ ...s.card, background: '#FFFBEB' }}>
                <div style={{ fontSize: 28 }}>🔧</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>
                  {customers.filter(c => c.status === 'פעיל').length}
                </div>
                <div style={{ fontSize: 13, color: '#64748B' }}>פעילים</div>
              </div>
            </div>
            <button style={s.btn} onClick={() => setScreen('newCustomer')}>+ לקוח חדש</button>
            <button style={{ ...s.btn, background: '#F1F5F9', color: '#374151' }} onClick={() => setScreen('customers')}>כל הלקוחות</button>
          </div>
        )}

        {screen === 'customers' && (
          <div>
            <input style={s.input} placeholder="🔍 חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>{filtered.length} לקוחות</div>
            {filtered.map(c => (
              <div key={c.id} style={{ ...s.card, cursor: 'pointer' }} onClick={() => { setSelectedCustomer(c); setScreen('customer'); }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{c.phone}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{c.address}, {c.city}</div>
              </div>
            ))}
            <button style={s.btn} onClick={() => setScreen('newCustomer')}>+ לקוח חדש</button>
          </div>
        )}

        {screen === 'customer' && selectedCustomer && (
          <div>
            <button onClick={() => setScreen('customers')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12 }}>← חזרה</button>
            <div style={s.card}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedCustomer.name}</div>
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>📞 {selectedCustomer.phone}</div>
              <div style={{ fontSize: 14, color: '#64748B' }}>📍 {selectedCustomer.address}</div>
              {selectedCustomer.notes && <div style={{ marginTop: 8, color: '#78350F', background: '#FFFBEB', padding: 8, borderRadius: 8, fontSize: 13 }}>📝 {selectedCustomer.notes}</div>}
            </div>
            <button style={s.btn} onClick={() => setScreen('newJob')}>+ הוסף עבודה</button>
          </div>
        )}

        {screen === 'newCustomer' && (
          <div>
            <button onClick={() => setScreen('customers')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12 }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>לקוח חדש</div>
            {[['name','שם לקוח'],['phone','טלפון'],['address','כתובת'],['city','עיר'],['notes','הערות']].map(([k,l]) => (
              <div key={k}>
                <label style={s.label}>{l}</label>
                <input style={s.input} value={(newCustomer as any)[k]} onChange={e => setNewCustomer(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <button style={s.btn} onClick={saveCustomer} disabled={loading}>{loading ? 'שומר...' : 'שמור לקוח'}</button>
          </div>
        )}

        {screen === 'newJob' && (
          <div>
            <button onClick={() => setScreen('customer')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12 }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>עבודה חדשה</div>
            {[['date','תאריך','date'],['type','סוג עבודה','text'],['description','תיאור','text'],['price','מחיר ₪','number'],['notes','הערות','text']].map(([k,l,t]) => (
              <div key={k}>
                <label style={s.label}>{l}</label>
                <input style={s.input} type={t} value={(newJob as any)[k]} onChange={e => setNewJob(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <button style={s.btn} onClick={saveJob} disabled={loading}>{loading ? 'שומר...' : 'שמור עבודה'}</button>
          </div>
        )}
      </div>

      <div style={s.nav}>
        {[['🏠','ראשי','dashboard'],['👥','לקוחות','customers'],['🔍','חיפוש','search']].map(([icon,label,scr]) => (
          <button key={scr} style={s.navBtn(screen === scr)} onClick={() => setScreen(scr)}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div>{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}