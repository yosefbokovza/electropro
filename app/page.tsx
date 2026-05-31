'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const JOB_STATUSES = ['הצעת מחיר', 'אושר', 'בביצוע', 'הסתיים', 'תיקון תקלה'];

const STATUS_COLOR: any = {
  'הצעת מחיר': '#3B82F6',
  'אושר': '#10B981',
  'בביצוע': '#F59E0B',
  'הסתיים': '#6B7280',
  'תיקון תקלה': '#EF4444',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

const compressImage = (base64: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = base64;
  });
};

const emptyJob = () => ({ date: new Date().toISOString().split('T')[0], type: '', description: '', price: '', status: 'בביצוע', notes: '', reminder: '', image: '' });
const emptyCustomer = () => ({ name: '', phone: '', address: '', city: '', notes: '', status: 'פעיל' });
const emptyReminder = () => ({ customerName: '', date: '', note: '' });

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
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingReminder, setEditingReminder] = useState<any>(null);

  const [newCustomer, setNewCustomer] = useState<any>(emptyCustomer());
  const [newJob, setNewJob] = useState<any>(emptyJob());
  const [newReminder, setNewReminder] = useState<any>(emptyReminder());

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

  // CUSTOMER
  const saveCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return alert('שם וטלפון חובה');
    setLoading(true);
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), { ...newCustomer, updatedAt: new Date().toISOString() });
        setEditingCustomer(null);
      } else {
        await addDoc(collection(db, 'customers'), { ...newCustomer, createdAt: new Date().toISOString() });
      }
      setNewCustomer(emptyCustomer());
      await loadCustomers();
      setScreen('customers');
    } catch (e) { alert('שגיאה בשמירה'); }
    setLoading(false);
  };

  const deleteCustomer = async (c: any) => {
    if (!confirm(`למחוק את ${c.name}?`)) return;
    await deleteDoc(doc(db, 'customers', c.id));
    await loadCustomers();
    setScreen('customers');
  };

  const startEditCustomer = (c: any) => {
    setEditingCustomer(c);
    setNewCustomer({ name: c.name, phone: c.phone, address: c.address, city: c.city, notes: c.notes, status: c.status });
    setScreen('newCustomer');
  };

  // JOB
  const saveJob = async () => {
    if (!newJob.type) return alert('סוג עבודה חובה');
    if (!selectedCustomer?.id) return alert('לא נבחר לקוח');
    setLoading(true);
    try {
      let jobData = { ...newJob };
      if (jobData.image && jobData.image.startsWith('data:')) {
        jobData.image = await compressImage(jobData.image);
      }
      if (editingJob) {
        await updateDoc(doc(db, 'customers', selectedCustomer.id, 'jobs', editingJob.id), { ...jobData, updatedAt: new Date().toISOString() });
        setEditingJob(null);
      } else {
        await addDoc(collection(db, 'customers', selectedCustomer.id, 'jobs'), { ...jobData, createdAt: new Date().toISOString() });
      }
      setNewJob(emptyJob());
      await loadCustomerJobs(selectedCustomer.id);
      setScreen('customer');
    } catch (e) { console.error(e); alert('שגיאה בשמירה'); }
    setLoading(false);
  };

  const deleteJob = async (j: any) => {
    if (!confirm(`למחוק עבודה: ${j.type}?`)) return;
    await deleteDoc(doc(db, 'customers', selectedCustomer.id, 'jobs', j.id));
    await loadCustomerJobs(selectedCustomer.id);
  };

  const startEditJob = (job: any) => {
    setEditingJob(job);
    setNewJob({ ...job });
    setScreen('newJob');
  };

  // REMINDER
  const saveReminder = async () => {
    if (!newReminder.date || !newReminder.customerName) return alert('נא למלא שם ותאריך');
    try {
      if (editingReminder) {
        await updateDoc(doc(db, 'reminders', editingReminder.id), { ...newReminder, updatedAt: new Date().toISOString() });
        setEditingReminder(null);
      } else {
        await addDoc(collection(db, 'reminders'), { ...newReminder, createdAt: new Date().toISOString() });
      }
      setNewReminder(emptyReminder());
      await loadReminders();
      setScreen('reminders');
    } catch (e) { alert('שגיאה בשמירה'); }
  };

  const deleteReminder = async (r: any) => {
    if (!confirm(`למחוק תזכורת עבור ${r.customerName}?`)) return;
    await deleteDoc(doc(db, 'reminders', r.id));
    await loadReminders();
  };

  const startEditReminder = (r: any) => {
    setEditingReminder(r);
    setNewReminder({ customerName: r.customerName, date: r.date, note: r.note });
    setScreen('newReminder');
  };

  const handleImage = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setNewJob((p: any) => ({ ...p, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const sendWhatsApp = (customer: any, job: any) => {
    const msg = `שלום ${customer.name}! סיכום עבודה:\nסוג: ${job.type}\nתיאור: ${job.description}\nמחיר: ₪${job.price}\nסטטוס: ${job.status}\nתאריך: ${formatDate(job.date)}`;
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
    btnDanger: { background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 10, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flex: 1, marginBottom: 0 },
    input: { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' as any, fontFamily: 'Arial', color: '#1E293B' },
    label: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
    nav: { position: 'fixed' as any, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 500, background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex' },
    navBtn: (active: boolean) => ({ flex: 1, padding: '8px 0 6px', border: 'none', background: 'none', cursor: 'pointer', color: active ? '#2563EB' : '#94A3B8', fontWeight: active ? 700 : 500, fontSize: 11 }),
    // צבעי טקסט כהים יותר
    textMain: { color: '#1E293B', fontWeight: 700 },
    textSub: { color: '#475569', fontSize: 13 },
    textMuted: { color: '#64748B', fontSize: 12 },
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
      <style>{`input::placeholder { color: #94A3B8 !important; opacity: 1; }`}</style>
      <div style={s.topbar}>
        <span>⚡ ElectroPro</span>
        <button onClick={() => signOut(auth)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>יציאה</button>
      </div>

      <div style={{ padding: '12px 16px 80px' }}>

        {/* DASHBOARD */}
        {screen === 'dashboard' && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: '#1E293B' }}>שלום! 👋</div>
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
                <div style={{ fontSize: 13, color: '#475569' }}>לקוחות</div>
              </div>
              <div style={{ ...s.card, background: '#FFFBEB' }}>
                <div style={{ fontSize: 28 }}>🔔</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>{reminders.length}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>תזכורות</div>
              </div>
            </div>
            <button style={s.btn} onClick={() => { setEditingCustomer(null); setNewCustomer(emptyCustomer()); setScreen('newCustomer'); }}>+ לקוח חדש</button>
            <button style={s.btnSec} onClick={() => setScreen('customers')}>כל הלקוחות</button>
            <button style={s.btnSec} onClick={() => setScreen('reminders')}>🔔 תזכורות</button>
          </div>
        )}

        {/* CUSTOMERS LIST */}
        {screen === 'customers' && (
          <div>
            <input style={s.input} placeholder="🔍 חיפוש..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>{filtered.length} לקוחות</div>
            {filtered.map(c => (
              <div key={c.id} style={s.card}>
                <div style={{ cursor: 'pointer' }} onClick={() => { setSelectedCustomer(c); loadCustomerJobs(c.id); setScreen('customer'); }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>📞 {c.phone}</div>
                  <div style={{ fontSize: 13, color: '#475569' }}>📍 {c.address}, {c.city}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => startEditCustomer(c)} style={{ ...s.btnSec, marginBottom: 0, padding: '7px', fontSize: 13, flex: 1 }}>✏️ עריכה</button>
                  <button onClick={() => deleteCustomer(c)} style={{ ...s.btnDanger }}>🗑️ מחיקה</button>
                </div>
              </div>
            ))}
            <button style={s.btn} onClick={() => { setEditingCustomer(null); setNewCustomer(emptyCustomer()); setScreen('newCustomer'); }}>+ לקוח חדש</button>
          </div>
        )}

        {/* CUSTOMER CARD */}
        {screen === 'customer' && selectedCustomer && (
          <div>
            <button onClick={() => setScreen('customers')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12, color: '#1E293B' }}>← חזרה</button>
            <div style={s.card}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1E293B' }}>{selectedCustomer.name}</div>
              <a href={`tel:${selectedCustomer.phone}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 14, color: '#2563EB', marginTop: 4 }}>📞 {selectedCustomer.phone}</div>
              </a>
              <div style={{ fontSize: 14, color: '#475569' }}>📍 {selectedCustomer.address}, {selectedCustomer.city}</div>
              {selectedCustomer.notes && <div style={{ marginTop: 8, color: '#78350F', background: '#FFFBEB', padding: 8, borderRadius: 8, fontSize: 13 }}>📝 {selectedCustomer.notes}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => startEditCustomer(selectedCustomer)} style={{ ...s.btnSec, marginBottom: 0, padding: '7px', fontSize: 13, flex: 1 }}>✏️ עריכה</button>
                <button onClick={() => deleteCustomer(selectedCustomer)} style={{ ...s.btnDanger }}>🗑️ מחיקה</button>
              </div>
            </div>
            <button style={s.btn} onClick={() => { setEditingJob(null); setNewJob(emptyJob()); setScreen('newJob'); }}>+ הוסף עבודה</button>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#1E293B' }}>עבודות</div>
            {selectedCustomerJobs.length === 0 && <div style={{ textAlign: 'center', color: '#64748B', padding: 20 }}>אין עבודות עדיין</div>}
            {selectedCustomerJobs.map(j => (
              <div key={j.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, color: '#1E293B' }}>{j.type}</div>
                  <span style={{ background: STATUS_COLOR[j.status] + '22', color: STATUS_COLOR[j.status], padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{j.status}</span>
                </div>
                {j.description && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{j.description}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {j.price ? <div style={{ fontWeight: 700, color: '#1E293B' }}>₪{j.price}</div> : <div />}
                  <div style={{ fontSize: 12, color: '#64748B' }}>{formatDate(j.date)}</div>
                </div>
                {j.image && <img src={j.image} style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />}
                {j.reminder && <div style={{ fontSize: 12, color: '#F59E0B', marginTop: 4 }}>🔔 תזכורת: {formatDate(j.reminder)}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => startEditJob(j)} style={{ ...s.btnSec, marginBottom: 0, padding: '8px', fontSize: 13, flex: 1 }}>✏️ עריכה</button>
                  <button onClick={() => sendWhatsApp(selectedCustomer, j)} style={{ ...s.btnSec, marginBottom: 0, padding: '8px', fontSize: 13, flex: 1 }}>📱 וואטסאפ</button>
                  <button onClick={() => deleteJob(j)} style={{ ...s.btnDanger }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NEW / EDIT CUSTOMER */}
        {screen === 'newCustomer' && (
          <div>
            <button onClick={() => setScreen('customers')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12, color: '#1E293B' }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1E293B' }}>{editingCustomer ? '✏️ עריכת לקוח' : 'לקוח חדש'}</div>
            {([['name', 'שם לקוח'], ['phone', 'טלפון'], ['address', 'כתובת'], ['city', 'עיר'], ['notes', 'הערות']] as [string, string][]).map(([k, l]) => (
              <div key={k}>
                <label style={s.label}>{l}</label>
                <input style={s.input} value={(newCustomer as any)[k]} onChange={e => setNewCustomer((p: any) => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <button style={s.btn} onClick={saveCustomer} disabled={loading}>{loading ? 'שומר...' : editingCustomer ? 'עדכן לקוח' : 'שמור לקוח'}</button>
          </div>
        )}

        {/* NEW / EDIT JOB */}
        {screen === 'newJob' && (
          <div>
            <button onClick={() => { setEditingJob(null); setScreen('customer'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12, color: '#1E293B' }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1E293B' }}>
              {editingJob ? '✏️ עריכת עבודה' : 'עבודה חדשה'} — {selectedCustomer?.name}
            </div>

            <label style={s.label}>תאריך</label>
            <input style={s.input} type="date" value={newJob.date} onChange={e => setNewJob((p: any) => ({ ...p, date: e.target.value }))} />

            <label style={s.label}>סוג עבודה</label>
            <input style={s.input} value={newJob.type} onChange={e => setNewJob((p: any) => ({ ...p, type: e.target.value }))} placeholder="החלפת לוח, תקלה, הוספת שקעים..." />

            <label style={s.label}>סטטוס</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {JOB_STATUSES.map(st => (
                <button key={st} onClick={() => setNewJob((p: any) => ({ ...p, status: st }))} style={{
                  padding: '10px', borderRadius: 10, border: `2px solid ${newJob.status === st ? STATUS_COLOR[st] : '#E2E8F0'}`,
                  background: newJob.status === st ? STATUS_COLOR[st] + '22' : '#fff',
                  color: newJob.status === st ? STATUS_COLOR[st] : '#374151',
                  fontWeight: newJob.status === st ? 700 : 500, cursor: 'pointer', fontSize: 13,
                }}>{st}</button>
              ))}
            </div>

            <label style={s.label}>תיאור</label>
            <input style={s.input} value={newJob.description} onChange={e => setNewJob((p: any) => ({ ...p, description: e.target.value }))} placeholder="תיאור העבודה..." />

            <label style={s.label}>מחיר ₪</label>
            <input style={s.input} type="number" value={newJob.price} onChange={e => setNewJob((p: any) => ({ ...p, price: e.target.value }))} placeholder="0" />

            <label style={s.label}>הערות</label>
            <input style={s.input} value={newJob.notes} onChange={e => setNewJob((p: any) => ({ ...p, notes: e.target.value }))} placeholder="הערות נוספות..." />

            <label style={s.label}>תזכורת (תאריך חזרה)</label>
            <input style={s.input} type="date" value={newJob.reminder} onChange={e => setNewJob((p: any) => ({ ...p, reminder: e.target.value }))} />

            <label style={s.label}>תמונה</label>
            <input ref={imgRef} type="file" accept="image/*" capture="environment" onChange={handleImage} style={{ display: 'none' }} />
            <button style={s.btnSec} onClick={() => imgRef.current?.click()}>📷 צלם / בחר תמונה</button>
            {newJob.image && <img src={newJob.image} style={{ width: '100%', borderRadius: 8, marginBottom: 12 }} />}

            <button style={s.btn} onClick={saveJob} disabled={loading}>{loading ? 'שומר...' : editingJob ? 'עדכן עבודה' : 'שמור עבודה'}</button>
          </div>
        )}

        {/* REMINDERS */}
        {screen === 'reminders' && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1E293B' }}>🔔 תזכורות</div>
            <button style={s.btn} onClick={() => { setEditingReminder(null); setNewReminder(emptyReminder()); setScreen('newReminder'); }}>+ תזכורת חדשה</button>
            {reminders.length === 0 && <div style={{ textAlign: 'center', color: '#64748B', padding: 20 }}>אין תזכורות</div>}
            {reminders.sort((a, b) => a.date > b.date ? 1 : -1).map(r => (
              <div key={r.id} style={{ ...s.card, borderRight: `4px solid ${r.date === new Date().toISOString().split('T')[0] ? '#F59E0B' : '#E2E8F0'}` }}>
                <div style={{ fontWeight: 700, color: '#1E293B' }}>{r.customerName}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>{r.note}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>📅 {formatDate(r.date)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => startEditReminder(r)} style={{ ...s.btnSec, marginBottom: 0, padding: '7px', fontSize: 13, flex: 1 }}>✏️ עריכה</button>
                  <button onClick={() => deleteReminder(r)} style={{ ...s.btnDanger }}>🗑️ מחיקה</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NEW / EDIT REMINDER */}
        {screen === 'newReminder' && (
          <div>
            <button onClick={() => setScreen('reminders')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 12, color: '#1E293B' }}>← חזרה</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1E293B' }}>{editingReminder ? '✏️ עריכת תזכורת' : 'תזכורת חדשה'}</div>
            <label style={s.label}>שם לקוח</label>
            <input style={s.input} value={newReminder.customerName} onChange={e => setNewReminder((p: any) => ({ ...p, customerName: e.target.value }))} placeholder="שם הלקוח..." />
            <label style={s.label}>תאריך</label>
            <input style={s.input} type="date" value={newReminder.date} onChange={e => setNewReminder((p: any) => ({ ...p, date: e.target.value }))} />
            <label style={s.label}>הערה</label>
            <input style={s.input} value={newReminder.note} onChange={e => setNewReminder((p: any) => ({ ...p, note: e.target.value }))} placeholder="מה לעשות..." />
            <button style={s.btn} onClick={saveReminder}>{editingReminder ? 'עדכן תזכורת' : 'שמור תזכורת'}</button>
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
