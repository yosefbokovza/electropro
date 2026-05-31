'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';

const JOB_STATUSES = ['הצעת מחיר', 'אושר', 'בביצוע', 'הסתיים', 'תיקון תקלה'];

const STATUS_COLOR: any = {
  'הצעת מחיר': '#3B82F6',
  'אושר': '#10B981',
  'בביצוע': '#F59E0B',
  'הסתיים': '#6B7280',
  'תיקון תקלה': '#EF4444',
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screen, setScreen] = useState('dashboard');
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerJobs, setSelectedCustomerJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);

  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', city: '', notes: '', status: 'פעיל' });
  const [newJob, setNewJob] = useState({ date: new Date().toISOString().split('T')[0], type: '', description: '', price: '', status: 'בביצוע', notes: '', reminder: '', image: '' });
  const [newReminder, setNewReminder] = useState({ customerName: '', date: '', note: '' });

  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => { if (user) { loadCustomers(); loadReminders(); } }, [user]);

  const loadCustomers = async () => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadCustomerJobs = async (customerId: string) => {
    const q = query(collection(db, 'customers', customerId, 'jobs'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setSelectedCustomerJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadReminders = async () => {
    const snap = await getDocs(collection(db, 'reminders'));
    setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const login = async () => {
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch { alert('פרטים שגויים'); }
  };

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
    if (!selectedCustomer?.id) return alert('לא נבחר לקוח');
    setLoading(true);
    try {
      await addDoc(collection(db, 'customers', selectedCustomer.id, 'jobs'), {
        ...newJob,
        createdAt: new Date().toISOString()
      });
      setNewJob({ date: new Date().toISOString().split('T')[0], type: '', description: '', price: '', status: 'בביצוע', notes: '', reminder: '', image: '' });
      await loadCustomerJobs(selectedCustomer.id);
      setScreen('customer');
    } catch (e) {
      alert('שגיאה בשמירה');
    }
    setLoading(false);
  };

  const saveReminder = async () => {
    if (!newReminder.date || !newReminder.customerName) return alert('נא למלא שם ותאריך');
    await addDoc(collection(db, 'reminders'), { ...newReminder, createdAt: new Date().toISOString() });
    setNewReminder({ customerName: '', date: '', note: '' });
    await loadReminders();
    setScreen('reminders');
  };

  const handleImage = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setNewJob(p => ({ ...p, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const sendWhatsApp = (customer: any, job: any) => {
    const msg = `שלום ${customer.name}! סיכום עבודה:\nסוג: ${job.type}\nתיאור: ${job.description}\nמחיר: ₪${job.price}\nסטטוס: ${job.status}\nתאריך: ${job.date}`;
    const phone = customer.phone.replace(/\D/g, '');
    const intlPhone = phone.startsWith('0') ? '972' + phone.slice(1) : phone;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = customers.filter(c =>
    !search || c.name?.includes(search) || c.phone?.includes(search) || c.address?.includes(search)
  );

  const todayReminders = reminders.filter(r => r.date === new Date().toISOString().split('T')[0]);

  const s: any = {
    app: { fontFamily: 'Arial', direction: 'rtl', maxWidth: 500, margin: '0 auto', minHeight: '100vh', background: '#F8FAFC' },
    topbar: { background: '#2563EB', color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 },
    card: { background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9' },
    btn: { background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: 8 },
    btnSec: { background: '#F1F5F9', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: 8 },
    input: { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' as any, fontFamily: 'Arial' },
    label: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
    nav: { position: 'fixed' as any, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 500, background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex' },
    navBtn: (active: boolean) => ({ flex: 1, padding: '8px 0 6px', border: 'none', background: 'none', cursor: 'pointer', color: active ? '#2563EB' : '#94A3B8', fontWeight: active ? 700 : 500, fontSize: 11 }),
  };

  if (!user) return (
    <div style={{ ...s.app, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1E3A5F, #2563EB)' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '90%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>ElectroPro</div>
        </div>
        <label style={s.label}>אימייל</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        <label style={s.label}>סיסמה</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button style={s.btn} onClick={login}>כניסה</button>
      </div>
    </div>
  );

  return (
    <div style={s.app}>
      <div style={s.topbar}>
        <span>⚡ ElectroPro</span>
        <button onClick={() => signOut(auth)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>יציאה</button>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>

        {/* DASHBOARD */}
        {screen === 'dashboard' && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>שלום! 👋</div>
            {todayReminders.length > 0 && (
              <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 4 }}>🔔 תזכורות להיום ({todayReminders.length})</div>
                {todayReminders.map(r => <div key={r.id} style={{ fontSize: 13, color: '#78350F' }}>• {r.customerName} — {r.note}</div>)}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ ...s.card, background: '#EFF6FF' }}>
                <div style={{ fontSize: 28 }}>👥</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#2563EB' }}>{customers.length}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>לקוחות</div>
              </div>
              <div style={{ ...s.card, background: '#FFFBEB' }}>
                <div style={{ fontSize: 28 }}>🔔</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>{reminders.length}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>תזכורות</div>
              </div>
            </div>
            <button style={s.btn} onClick={() => setScreen('newCustomer')}>+ לקוח חדש</button>
            <button style={s.btnSec} onClick={() => setScreen('customers')}>כל הלקוחות</button>
            <button style={s.btnSec} onClick={() => setScreen('reminders')}>🔔 תזכורות</button>
          </div>
        )}

        {/* CUSTOMERS LIST */}
        {screen === 'customers' && (
          <div>
            <input style={s.input} placeholder="🔍 חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>{filtered.length} לקוחות</div>
            {filtered.map(c => (
              <div key={c.id} style={{ ...s.card, cursor: 'pointer' }} onClick={() => { setSelectedCustomer(c); loadCustomerJobs(c.id); setScreen('customer'); }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>📞 {c.phone}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>📍 {c.address}, {c.city}</div>
              </div>
            ))}
            <button style={s.btn} onClick={() => setScreen('newCustomer')}>+ לקוח חדש</button>
          </div>
        )}

        {/* CUSTOMER CARD */}
        {screen === 'customer' && selectedCustomer && (
          <div>
            <button onClick={() => setScreen('customers')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12 }}>← חזרה</button>
            <div style={s.card}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedCustomer.name}</div>
              <a href={`tel:${selectedCustomer.phone}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 14, color: '#2563EB', marginTop: 4 }}>📞 {selectedCustomer.phone}</div>
              </a>
              <div style={{ fontSize: 14, color: '#64748B' }}>📍 {selectedCustomer.address}, {selectedCustomer.city}</div>
              {selectedCustomer.notes && <div style={{ marginTop: 8, color: '#78350F', background: '#FFFBEB', padding: 8, borderRadius: 8, fontSize: 13 }}>📝 {selectedCustomer.notes}</div>}
            </div>
            <button style={s.btn} onClick={() => setScreen('newJob')}>+ הוסף עבודה</button>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>עבודות</div>
            {selectedCustomerJobs.length === 0 && <div style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>אין עבודות עדיין</div>}
            {selectedCustomerJobs.map(j => (
              <div key={j.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700 }}>{j.type}</div>
                  <span style={{ background: STATUS_COLOR[j.status] + '22', color: STATUS_COLOR[j.status], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{j.status}</span>
                </div>
                {j.description && <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{j.description}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {j.price ? <div style={{ fontWeight: 700 }}>₪{j.price}</div> : <div />}
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{j.date}</div>
                </div>
                {j.image && <img src={j.image} style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />}
                {j.reminder && <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 4 }}>🔔 תזכורת: {j.reminder}</div>}
                <button onClick={() => sendWhatsApp(selectedCustomer, j)} style={{ ...s.btnSec, marginTop: 8, marginBottom: 0, padding: '8px', fontSize: 13 }}>
                  📱 שלח סיכום בוואטסאפ
                </button>
              </div>
            ))}
          </div>
        )}

        {/* NEW CUSTOMER */}
        {screen === 'newCustomer' && (
          <div>
            <button onClick={() => setScreen('customers')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12 }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>לקוח חדש</div>
            {([['name', 'שם לקוח'], ['phone', 'טלפון'], ['address', 'כתובת'], ['city', 'עיר'], ['notes', 'הערות']] as [string, string][]).map(([k, l]) => (
              <div key={k}>
                <label style={s.label}>{l}</label>
                <input style={s.input} value={(newCustomer as any)[k]} onChange={e => setNewCustomer(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <button style={s.btn} onClick={saveCustomer} disabled={loading}>{loading ? 'שומר...' : 'שמור לקוח'}</button>
          </div>
        )}

        {/* NEW JOB */}
        {screen === 'newJob' && (
          <div>
            <button onClick={() => setScreen('customer')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12 }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>עבודה חדשה — {selectedCustomer?.name}</div>

            <label style={s.label}>תאריך</label>
            <input style={s.input} type="date" value={newJob.date} onChange={e => setNewJob(p => ({ ...p, date: e.target.value }))} />

            <label style={s.label}>סוג עבודה</label>
            <input style={s.input} value={newJob.type} onChange={e => setNewJob(p => ({ ...p, type: e.target.value }))} placeholder="החלפת לוח, תקלה, הוספת שקעים..." />

            <label style={s.label}>סטטוס</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {JOB_STATUSES.map(st => (
                <button key={st} onClick={() => setNewJob(p => ({ ...p, status: st }))} style={{
                  padding: '10px', borderRadius: 10, border: `2px solid ${newJob.status === st ? STATUS_COLOR[st] : '#E2E8F0'}`,
                  background: newJob.status === st ? STATUS_COLOR[st] + '22' : '#fff',
                  color: newJob.status === st ? STATUS_COLOR[st] : '#374151',
                  fontWeight: newJob.status === st ? 700 : 500, cursor: 'pointer', fontSize: 13,
                }}>{st}</button>
              ))}
            </div>

            <label style={s.label}>תיאור</label>
            <input style={s.input} value={newJob.description} onChange={e => setNewJob(p => ({ ...p, description: e.target.value }))} placeholder="תיאור העבודה..." />

            <label style={s.label}>מחיר ₪</label>
            <input style={s.input} type="number" value={newJob.price} onChange={e => setNewJob(p => ({ ...p, price: e.target.value }))} placeholder="0" />

            <label style={s.label}>הערות</label>
            <input style={s.input} value={newJob.notes} onChange={e => setNewJob(p => ({ ...p, notes: e.target.value }))} placeholder="הערות נוספות..." />

            <label style={s.label}>תזכורת (תאריך חזרה)</label>
            <input style={s.input} type="date" value={newJob.reminder} onChange={e => setNewJob(p => ({ ...p, reminder: e.target.value }))} />

            <label style={s.label}>תמונה</label>
            <input ref={imgRef} type="file" accept="image/*" capture="environment" onChange={handleImage} style={{ display: 'none' }} />
            <button style={s.btnSec} onClick={() => imgRef.current?.click()}>📷 צלם / בחר תמונה</button>
            {newJob.image && <img src={newJob.image} style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />}

            <button style={s.btn} onClick={saveJob} disabled={loading}>{loading ? 'שומר...' : 'שמור עבודה'}</button>
          </div>
        )}

        {/* REMINDERS */}
        {screen === 'reminders' && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🔔 תזכורות</div>
            <button style={s.btn} onClick={() => setScreen('newReminder')}>+ תזכורת חדשה</button>
            {reminders.length === 0 && <div style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>אין תזכורות</div>}
            {reminders.sort((a, b) => a.date > b.date ? 1 : -1).map(r => (
              <div key={r.id} style={{ ...s.card, borderRight: `4px solid ${r.date === new Date().toISOString().split('T')[0] ? '#F59E0B' : '#E2E8F0'}` }}>
                <div style={{ fontWeight: 700 }}>{r.customerName}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{r.note}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>📅 {r.date}</div>
              </div>
            ))}
          </div>
        )}

        {/* NEW REMINDER */}
        {screen === 'newReminder' && (
          <div>
            <button onClick={() => setScreen('reminders')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12 }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>תזכורת חדשה</div>
            <label style={s.label}>שם לקוח</label>
            <input style={s.input} value={newReminder.customerName} onChange={e => setNewReminder(p => ({ ...p, customerName: e.target.value }))} placeholder="שם הלקוח..." />
            <label style={s.label}>תאריך</label>
            <input style={s.input} type="date" value={newReminder.date} onChange={e => setNewReminder(p => ({ ...p, date: e.target.value }))} />
            <label style={s.label}>הערה</label>
            <input style={s.input} value={newReminder.note} onChange={e => setNewReminder(p => ({ ...p, note: e.target.value }))} placeholder="מה לעשות..." />
            <button style={s.btn} onClick={saveReminder}>שמור תזכורת</button>
          </div>
        )}

      </div>

      {/* NAV */}
      <div style={s.nav}>
        {([['🏠', 'ראשי', 'dashboard'], ['👥', 'לקוחות', 'customers'], ['🔔', 'תזכורות', 'reminders']] as [string, string, string][]).map(([icon, label, scr]) => (
          <button key={scr} style={s.navBtn(screen === scr || (scr === 'dashboard' && screen === 'newCustomer') || (scr === 'customers' && ['customer', 'newJob'].includes(screen)))} onClick={() => setScreen(scr)}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div>{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}