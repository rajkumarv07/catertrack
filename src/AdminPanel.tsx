import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, FileText, LogOut, RefreshCw,
  CheckCircle2, XCircle, Clock, Utensils, CreditCard,
  Sun, Moon, AlertCircle, ShieldCheck, TrendingUp,
  ChevronRight, Search, Download, Eye, Settings2, Key, Save,
  Smartphone, Building2, BadgeCheck, RotateCcw, X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { StoredUserData, AdminView, Transaction, getAllTransactions, saveTransaction, TXN_STORE_KEY } from './types';
import PaymentSettings from './PaymentSettings';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const DAYS = ['monday','tuesday','wednesday','thursday','friday'] as const;
const CRED_KEY = 'catertrack_admin_creds';

function getAllEmployees(): { id: string; data: StoredUserData }[] {
  const results: { id: string; data: StoredUserData }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('catertrack_user_')) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) results.push({ id: key.replace('catertrack_user_',''), data: JSON.parse(raw) });
      } catch {}
    }
  }
  return results.sort((a,b) => (b.data.lastUpdated??'').localeCompare(a.data.lastUpdated??''));
}

function saveEmployee(id: string, data: StoredUserData) {
  localStorage.setItem(`catertrack_user_${id}`, JSON.stringify(data));
}

// ─── STAT CARD ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color='emerald', onClick }: {
  icon: React.ElementType; label: string; value: string|number;
  sub?: string; color?: 'emerald'|'orange'|'red'|'blue'; onClick?: ()=>void;
}) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    orange:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
    red:     'text-red-400 bg-red-500/10 border-red-500/20',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      onClick={onClick}
      className={cn(
        'bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 transition-all',
        onClick && 'cursor-pointer hover:border-emerald-500/30 hover:bg-white/[0.03]'
      )}
    >
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center border mb-6', colors[color])}>
        <Icon size={22}/>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-neutral-400 text-sm font-medium">{label}</div>
      {sub && <div className="text-neutral-600 text-xs mt-1 font-mono">{sub}</div>}
      {onClick && <div className="text-emerald-500 text-xs mt-3 font-bold flex items-center gap-1">View details <ChevronRight size={12}/></div>}
    </motion.div>
  );
}

// ─── EMPLOYEE DETAIL MODAL ────────────────────────────────────────────────
function EmployeeModal({ emp, txns, onClose }: {
  emp: { id: string; data: StoredUserData };
  txns: Transaction[];
  onClose: ()=>void;
}) {
  const { id, data } = emp;
  const empTxns = txns.filter(t => t.employeeId === id);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <motion.div
        initial={{ scale:0.9, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }}
        exit={{ scale:0.9, opacity:0 }}
        onClick={e=>e.stopPropagation()}
        className="bg-[#111] border border-white/10 rounded-[3rem] p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-emerald-500 font-mono text-xs tracking-[0.3em] uppercase mb-1">Employee Record</div>
            <div className="text-2xl font-bold text-white">{id}</div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white"><X size={22}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { k:'Shift', v: data.shift??'—' },
            { k:'Status', v: data.isPaid?'✓ Paid':'✗ Unpaid' },
            { k:'Method', v: data.paymentMethod??'—' },
            { k:'Txn ID', v: data.txnId??'—' },
          ].map(({k,v})=>(
            <div key={k} className="bg-white/5 rounded-2xl p-4">
              <div className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-1">{k}</div>
              <div className="text-white font-semibold text-sm font-mono">{v}</div>
            </div>
          ))}
        </div>
        {data.plan && (
          <div className="bg-white/5 rounded-2xl p-5 mb-5">
            <div className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-3">Weekly Plan</div>
            <div className="grid grid-cols-5 gap-2">
              {DAYS.map(day=>(
                <div key={day} className="text-center">
                  <div className="text-neutral-600 text-[10px] font-mono uppercase mb-1">{day.slice(0,3)}</div>
                  <div className={cn('px-1 py-1 rounded-xl text-[10px] font-bold',
                    data.plan![day]==='Veg' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                  )}>{data.plan![day]==='Veg'?'V':'NV'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {empTxns.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5">
            <div className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-3">Transactions</div>
            {empTxns.map(t=>(
              <div key={t.txnId} className="border-b border-white/5 pb-3 mb-3 last:border-0 last:mb-0 last:pb-0">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm text-emerald-400 font-bold">{t.txnId}</span>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                    t.status==='verified' ? 'bg-emerald-500/10 text-emerald-400'
                    : t.status==='rejected' ? 'bg-red-500/10 text-red-400'
                    : 'bg-amber-500/10 text-amber-400'
                  )}>{t.status.toUpperCase()}</span>
                </div>
                <div className="text-neutral-500 text-xs mt-1 font-mono">
                  ₹{t.amount} · {t.method} · {format(parseISO(t.timestamp),'dd MMM, HH:mm')}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AdminPanel({ onLogout }: { onLogout: ()=>void }) {
  const [view, setView] = useState<AdminView>('dashboard');
  const [employees, setEmployees] = useState<{id:string;data:StoredUserData}[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [txnSearch, setTxnSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<{id:string;data:StoredUserData}|null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Settings state
  const loadCreds = () => { try { const r=localStorage.getItem(CRED_KEY); if(r) return JSON.parse(r); } catch {} return {id:'ADMIN1',password:'cater@2026'}; };
  const [newId, setNewId] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const refresh = useCallback(() => {
    setEmployees(getAllEmployees());
    setTransactions(getAllTransactions());
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Stats ──
  const total = employees.length;
  const paid = employees.filter(e=>e.data.isPaid).length;
  const morning = employees.filter(e=>e.data.shift==='Morning').length;
  const night = employees.filter(e=>e.data.shift==='Night').length;
  const termPending = employees.filter(e=>e.data.terminationRequested && e.data.terminationStatus==='pending').length;
  const vegTotal = employees.reduce((a,e)=>a+(e.data.plan?DAYS.filter(d=>e.data.plan![d]==='Veg').length:0),0);
  const nvTotal  = employees.reduce((a,e)=>a+(e.data.plan?DAYS.filter(d=>e.data.plan![d]==='Non-Veg').length:0),0);
  const pendingTxns = transactions.filter(t=>t.status==='pending').length;
  const totalCollected = transactions.filter(t=>t.status==='verified').reduce((a,t)=>a+t.amount,0);

  // ── Transaction actions ──
  const verifyTxn = (txnId: string) => {
    const txn = transactions.find(t=>t.txnId===txnId);
    if(!txn) return;
    const updated = {...txn, status:'verified' as const, verifiedAt: new Date().toISOString()};
    saveTransaction(updated);
    // Also mark employee as verified
    const emp = employees.find(e=>e.id===txn.employeeId);
    if(emp) saveEmployee(emp.id, {...emp.data, isPaid:true});
    refresh();
  };

  const rejectTxn = (txnId: string) => {
    const txn = transactions.find(t=>t.txnId===txnId);
    if(!txn) return;
    saveTransaction({...txn, status:'rejected' as const});
    // Mark employee unpaid
    const emp = employees.find(e=>e.id===txn.employeeId);
    if(emp) saveEmployee(emp.id, {...emp.data, isPaid:false});
    refresh();
  };

  const processRefund = (txnId: string) => {
    const txn = transactions.find(t=>t.txnId===txnId);
    if(!txn) return;
    saveTransaction({...txn, refundStatus:'processed' as const});
    // Approve termination on employee record
    const emp = employees.find(e=>e.id===txn.employeeId);
    if(emp) saveEmployee(emp.id, {...emp.data, terminationStatus:'approved', isPaid:false});
    refresh();
  };

  // ── Termination action ──
  const handleTermination = (empId: string, action: 'approved'|'rejected') => {
    const emp = employees.find(e=>e.id===empId);
    if(!emp) return;
    saveEmployee(empId, {...emp.data, terminationStatus: action});
    refresh();
  };

  // ── Credentials ──
  const saveCreds = () => {
    setSettingsError('');
    if(newId.trim().length>0 && newId.trim().length<4){setSettingsError('ID must be at least 4 chars');return;}
    if(newPw.length>0 && newPw.length<6){setSettingsError('Password min 6 chars');return;}
    if(newPw && newPw!==confirmPw){setSettingsError('Passwords do not match');return;}
    const cur=loadCreds();
    localStorage.setItem(CRED_KEY, JSON.stringify({id:newId.trim()||cur.id, password:newPw||cur.password}));
    setNewId(''); setNewPw(''); setConfirmPw('');
    setSettingsSaved(true); setTimeout(()=>setSettingsSaved(false),3000);
  };

  // ── CSV Export ──
  const exportCSV = () => {
    const header = 'EmployeeID,Shift,Mon,Tue,Wed,Thu,Fri,Paid,PayMethod,TxnID,LastUpdated,Termination\n';
    const rows = employees.map(({id,data})=>{
      const p=data.plan;
      return [id,data.shift??'',
        p?.monday??'',p?.tuesday??'',p?.wednesday??'',p?.thursday??'',p?.friday??'',
        data.isPaid?'Yes':'No', data.paymentMethod??'', data.txnId??'',
        data.lastUpdated?format(parseISO(data.lastUpdated),'yyyy-MM-dd HH:mm'):'',
        data.terminationRequested?(data.terminationStatus??'pending'):'none'
      ].join(',');
    }).join('\n');
    const blob=new Blob([header+rows],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`catertrack-manifest-${format(new Date(),'yyyy-MM-dd')}.csv`; a.click();
  };

  const exportTxnCSV = () => {
    const header='TxnID,EmployeeID,Method,Amount,Status,RefundStatus,Timestamp,VerifiedAt\n';
    const rows=transactions.map(t=>[
      t.txnId,t.employeeId,t.method,t.amount,t.status,t.refundStatus??'none',
      format(parseISO(t.timestamp),'yyyy-MM-dd HH:mm'),
      t.verifiedAt?format(parseISO(t.verifiedAt),'yyyy-MM-dd HH:mm'):''
    ].join(',')).join('\n');
    const blob=new Blob([header+rows],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`catertrack-transactions-${format(new Date(),'yyyy-MM-dd')}.csv`; a.click();
  };

  const navItems = [
    {id:'dashboard' as AdminView,    icon:LayoutDashboard, label:'Dashboard'},
    {id:'employees' as AdminView,    icon:Users,           label:'Employees',    badge:total},
    {id:'transactions' as AdminView, icon:CreditCard,      label:'Transactions', badge:pendingTxns},
    {id:'terminations' as AdminView, icon:AlertCircle,     label:'Terminations', badge:termPending},
    {id:'manifest' as AdminView,     icon:FileText,        label:'Manifest'},
    {id:'payment-config' as AdminView, icon:Smartphone,    label:'Payment'},
    {id:'settings' as AdminView,     icon:Settings2,       label:'Settings'},
  ];

  const filteredEmp = employees.filter(e=>e.id.toLowerCase().includes(search.toLowerCase()));
  const filteredTxn = transactions.filter(t=>
    t.txnId.toLowerCase().includes(txnSearch.toLowerCase()) ||
    t.employeeId.toLowerCase().includes(txnSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* SIDEBAR */}
      <aside className="w-64 min-h-screen bg-black/60 backdrop-blur-xl border-r border-white/5 flex flex-col fixed left-0 top-0 bottom-0 z-40">
        <div className="px-8 py-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <ShieldCheck size={18} className="text-black"/>
            </div>
            <div>
              <div className="font-bold text-white text-sm">CaterTrack</div>
              <div className="text-emerald-500 font-mono text-[10px] tracking-[0.2em] uppercase">Admin Console</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>setView(item.id)}
              className={cn('w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-sm font-semibold',
                view===item.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-neutral-500 hover:text-white hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-3"><item.icon size={16}/>{item.label}</div>
              {item.badge!==undefined && item.badge>0 && (
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black',
                  item.id==='terminations'||item.id==='transactions' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-neutral-400'
                )}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-4 py-6 border-t border-white/5 space-y-2">
          <button onClick={refresh} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-neutral-500 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold">
            <RefreshCw size={16}/> Refresh Data
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500/70 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm font-semibold">
            <LogOut size={16}/> Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 ml-64 min-h-screen overflow-auto">
        <div className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-10 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white capitalize">{view.replace('-',' ')}</h1>
            <p className="text-neutral-600 text-xs font-mono mt-0.5">Last sync: {format(lastRefresh,'HH:mm:ss')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-neutral-500 text-xs font-mono uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="px-10 py-10">
          <AnimatePresence mode="wait">

            {/* ══ DASHBOARD ══ */}
            {view==='dashboard' && (
              <motion.div key="dash" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <StatCard icon={Users}       label="Total Employees"    value={total}   sub="Active sessions"           color="emerald"
                    onClick={()=>setView('employees')}/>
                  <StatCard icon={CreditCard}  label="Paid Allocations"   value={paid}    sub={`₹${totalCollected} verified`} color="blue"
                    onClick={()=>setView('transactions')}/>
                  <StatCard icon={AlertCircle} label="Pending Tickets"    value={termPending} sub="Awaiting approval"     color="red"
                    onClick={()=>setView('terminations')}/>
                  <StatCard icon={TrendingUp}  label="Veg / Non-Veg"      value={`${vegTotal}/${nvTotal}`} sub="Meal distribution" color="orange"
                    onClick={()=>setView('manifest')}/>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                  {[{label:'Morning Shift',value:morning,icon:Sun,color:'orange'as const},{label:'Night Shift',value:night,icon:Moon,color:'blue'as const}].map(s=>(
                    <div key={s.label} className="bg-black/40 border border-white/5 rounded-[2rem] p-8 flex items-center gap-6">
                      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center border',
                        s.color==='orange' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                        : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                      )}><s.icon size={26}/></div>
                      <div>
                        <div className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-1">{s.label}</div>
                        <div className="text-3xl font-bold text-white">{s.value}</div>
                        <div className="text-neutral-600 text-xs mt-1">{total>0?Math.round((s.value/total)*100):0}% of workforce</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Recent transactions */}
                <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white">Recent Transactions</h3>
                    <button onClick={()=>setView('transactions')} className="text-emerald-400 text-xs font-bold flex items-center gap-1 hover:text-emerald-300">View All <ChevronRight size={14}/></button>
                  </div>
                  {transactions.length===0 ? (
                    <div className="text-center py-10 text-neutral-600">
                      <CreditCard size={36} className="mx-auto mb-3 opacity-20"/>
                      <p className="text-sm font-mono">No transactions yet.</p>
                    </div>
                  ) : transactions.slice(0,5).map(t=>(
                    <div key={t.txnId} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                      <div>
                        <div className="font-mono text-sm font-bold text-white">{t.txnId}</div>
                        <div className="text-neutral-500 text-xs mt-0.5">{t.employeeId} · {t.method} · ₹{t.amount}</div>
                      </div>
                      <span className={cn('text-xs font-bold px-3 py-1 rounded-full',
                        t.status==='verified' ? 'bg-emerald-500/10 text-emerald-400'
                        : t.status==='rejected' ? 'bg-red-500/10 text-red-400'
                        : 'bg-amber-500/10 text-amber-400'
                      )}>{t.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ══ EMPLOYEES ══ */}
            {view==='employees' && (
              <motion.div key="emp" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600"/>
                    <input type="text" placeholder="Search Employee ID..." value={search} onChange={e=>setSearch(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-emerald-500/50"/>
                  </div>
                  <button onClick={exportCSV} className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-bold hover:bg-emerald-500/20">
                    <Download size={16}/> Export CSV
                  </button>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-[2rem] overflow-hidden">
                  {filteredEmp.length===0 ? (
                    <div className="text-center py-20 text-neutral-600"><Users size={48} className="mx-auto mb-4 opacity-20"/><p className="font-mono text-sm">No employees found.</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-white/5">
                          {['Employee ID','Shift','Meals','Txn ID','Payment','Termination','Last Active',''].map(h=>(
                            <th key={h} className="px-5 py-4 text-left text-[10px] font-mono font-bold text-neutral-600 uppercase tracking-[0.2em]">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {filteredEmp.map(emp=>{
                            const {id,data}=emp;
                            const veg=data.plan?DAYS.filter(d=>data.plan![d]==='Veg').length:0;
                            const nv=data.plan?DAYS.filter(d=>data.plan![d]==='Non-Veg').length:0;
                            return (
                              <tr key={id} className="border-b border-white/5 hover:bg-white/[0.02] group">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">{id.slice(0,2)}</div>
                                    <span className="font-mono font-bold text-white text-sm">{id}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  {data.shift ? <div className="flex items-center gap-2">{data.shift==='Morning'?<Sun size={13} className="text-orange-400"/>:<Moon size={13} className="text-indigo-400"/>}<span className="text-sm text-neutral-300">{data.shift}</span></div> : <span className="text-neutral-600 text-sm">—</span>}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex gap-1">
                                    {veg>0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">{veg}V</span>}
                                    {nv>0  && <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold">{nv}NV</span>}
                                    {!veg&&!nv && <span className="text-neutral-600 text-sm">—</span>}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="font-mono text-xs text-emerald-400">{data.txnId??'—'}</span>
                                </td>
                                <td className="px-5 py-4">
                                  {data.isPaid
                                    ? <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold"><CheckCircle2 size={13}/> PAID</span>
                                    : <span className="flex items-center gap-1.5 text-neutral-500 text-xs font-bold"><XCircle size={13}/> UNPAID</span>}
                                </td>
                                <td className="px-5 py-4">
                                  {data.terminationRequested
                                    ? <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold border',
                                        data.terminationStatus==='approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : data.terminationStatus==='rejected' ? 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                      )}>{data.terminationStatus?.toUpperCase()??'PENDING'}</span>
                                    : <span className="text-neutral-600 text-xs">—</span>}
                                </td>
                                <td className="px-5 py-4"><span className="text-neutral-500 text-xs font-mono">{data.lastUpdated?format(parseISO(data.lastUpdated),'dd MMM, HH:mm'):'—'}</span></td>
                                <td className="px-5 py-4">
                                  <button onClick={()=>setSelectedEmp(emp)} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                                    <Eye size={13}/> View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══ TRANSACTIONS ══ */}
            {view==='transactions' && (
              <motion.div key="txn" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <div className="flex gap-4 mb-8">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600"/>
                    <input type="text" placeholder="Search by Txn ID or Employee ID..." value={txnSearch} onChange={e=>setTxnSearch(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-emerald-500/50"/>
                  </div>
                  <button onClick={exportTxnCSV} className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-bold hover:bg-emerald-500/20">
                    <Download size={16}/> Export CSV
                  </button>
                </div>

                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    {label:'Total',     value:transactions.length,                                    color:'text-white'},
                    {label:'Pending',   value:transactions.filter(t=>t.status==='pending').length,    color:'text-amber-400'},
                    {label:'Verified',  value:transactions.filter(t=>t.status==='verified').length,   color:'text-emerald-400'},
                  ].map(s=>(
                    <div key={s.label} className="bg-black/40 border border-white/5 rounded-2xl p-5 text-center">
                      <div className={cn('text-2xl font-bold mb-1',s.color)}>{s.value}</div>
                      <div className="text-neutral-500 text-xs font-mono uppercase tracking-widest">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-black/40 border border-white/5 rounded-[2rem] overflow-hidden">
                  {filteredTxn.length===0 ? (
                    <div className="text-center py-20 text-neutral-600"><CreditCard size={48} className="mx-auto mb-4 opacity-20"/><p className="font-mono text-sm">No transactions found.</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-white/5">
                          {['Txn ID','Employee','Method','Amount','Status','Refund','Time','Actions'].map(h=>(
                            <th key={h} className="px-5 py-4 text-left text-[10px] font-mono font-bold text-neutral-600 uppercase tracking-[0.2em]">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {filteredTxn.map(t=>(
                            <tr key={t.txnId} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="px-5 py-4 font-mono text-sm text-emerald-400 font-bold">{t.txnId}</td>
                              <td className="px-5 py-4 font-mono text-sm text-white">{t.employeeId}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-1.5 text-sm text-neutral-300">
                                  {t.method==='UPI'?<Smartphone size={13} className="text-emerald-400"/>
                                   :t.method==='Card'?<CreditCard size={13} className="text-blue-400"/>
                                   :<Building2 size={13} className="text-orange-400"/>}
                                  {t.method}
                                </div>
                              </td>
                              <td className="px-5 py-4 font-bold text-white">₹{t.amount}</td>
                              <td className="px-5 py-4">
                                <span className={cn('text-xs font-bold px-2 py-1 rounded-full',
                                  t.status==='verified' ? 'bg-emerald-500/10 text-emerald-400'
                                  : t.status==='rejected' ? 'bg-red-500/10 text-red-400'
                                  : 'bg-amber-500/10 text-amber-400'
                                )}>{t.status.toUpperCase()}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className={cn('text-xs font-bold px-2 py-1 rounded-full',
                                  t.refundStatus==='processed' ? 'bg-emerald-500/10 text-emerald-400'
                                  : t.refundStatus==='requested' ? 'bg-red-500/10 text-red-400'
                                  : 'bg-white/5 text-neutral-600'
                                )}>{(t.refundStatus??'none').toUpperCase()}</span>
                              </td>
                              <td className="px-5 py-4 text-neutral-500 text-xs font-mono">{format(parseISO(t.timestamp),'dd MMM, HH:mm')}</td>
                              <td className="px-5 py-4">
                                <div className="flex gap-2">
                                  {t.status==='pending' && (
                                    <>
                                      <button onClick={()=>verifyTxn(t.txnId)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20">
                                        <BadgeCheck size={13}/> Verify
                                      </button>
                                      <button onClick={()=>rejectTxn(t.txnId)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20">
                                        <XCircle size={13}/> Reject
                                      </button>
                                    </>
                                  )}
                                  {t.status==='verified' && t.refundStatus==='requested' && (
                                    <button onClick={()=>processRefund(t.txnId)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-500/20">
                                      <RotateCcw size={13}/> Refund
                                    </button>
                                  )}
                                  {t.status==='verified' && (!t.refundStatus||t.refundStatus==='none') && (
                                    <span className="text-neutral-600 text-xs font-mono">Verified ✓</span>
                                  )}
                                  {t.refundStatus==='processed' && (
                                    <span className="text-emerald-400 text-xs font-mono">Refunded ✓</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══ TERMINATIONS ══ */}
            {view==='terminations' && (
              <motion.div key="term" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                {employees.filter(e=>e.data.terminationRequested).length===0 ? (
                  <div className="text-center py-32 text-neutral-600"><CheckCircle2 size={56} className="mx-auto mb-4 opacity-20"/><p className="font-mono text-sm">No termination requests.</p></div>
                ) : employees.filter(e=>e.data.terminationRequested).map(({id,data})=>{
                  const empTxn = transactions.find(t=>t.employeeId===id && t.status==='verified');
                  return (
                    <motion.div key={id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
                      className={cn('bg-black/40 border rounded-[2rem] p-8 mb-4',
                        data.terminationStatus==='pending'||!data.terminationStatus ? 'border-red-500/20' : 'border-white/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono text-sm font-bold">{id.slice(0,2)}</div>
                          <div>
                            <div className="font-mono font-bold text-white text-lg">{id}</div>
                            <div className="text-neutral-500 text-xs mt-1">Ref: {data.terminationRef??'—'}</div>
                            {empTxn && <div className="text-emerald-400 text-xs font-mono mt-0.5">Txn: {empTxn.txnId} · ₹{empTxn.amount}</div>}
                            {data.lastUpdated && <div className="text-neutral-600 text-xs font-mono mt-0.5">{format(parseISO(data.lastUpdated),'PPP p')}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn('px-4 py-1.5 rounded-full text-xs font-black border',
                            data.terminationStatus==='approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : data.terminationStatus==='rejected' ? 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                          )}>{data.terminationStatus?.toUpperCase()??'PENDING'}</span>
                          {(!data.terminationStatus||data.terminationStatus==='pending') && (
                            <>
                              <button onClick={()=>handleTermination(id,'approved')} className="flex items-center gap-2 px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-bold hover:bg-emerald-500/20">
                                <CheckCircle2 size={15}/> Approve & Refund
                              </button>
                              <button onClick={()=>handleTermination(id,'rejected')} className="flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 text-neutral-400 rounded-2xl text-sm font-bold hover:bg-white/10">
                                <XCircle size={15}/> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {data.plan && (
                        <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-5 gap-3">
                          {DAYS.map(day=>(
                            <div key={day} className="text-center">
                              <div className="text-neutral-600 text-[10px] font-mono uppercase mb-1">{day.slice(0,3)}</div>
                              <div className={cn('px-2 py-1 rounded-xl text-[10px] font-bold',
                                data.plan![day]==='Veg' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                              )}>{data.plan![day]==='Veg'?'VEG':'NV'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* ══ MANIFEST ══ */}
            {view==='manifest' && (
              <motion.div key="mani" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <div className="flex justify-end mb-6">
                  <button onClick={exportCSV} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black rounded-2xl text-sm font-black hover:bg-emerald-400">
                    <Download size={16}/> Download CSV
                  </button>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8 mb-6">
                  <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Utensils size={18} className="text-emerald-400"/> Daily Kitchen Totals</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {DAYS.map(day=>{
                      const v=employees.filter(e=>e.data.plan?.[day]==='Veg').length;
                      const nv=employees.filter(e=>e.data.plan?.[day]==='Non-Veg').length;
                      return (
                        <div key={day} className="bg-white/5 rounded-2xl p-5 text-center">
                          <div className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-4 capitalize">{day.slice(0,3)}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between gap-2"><span className="text-emerald-400 text-xs font-bold">VEG</span><span className="text-white font-black text-lg">{v}</span></div>
                            <div className="flex justify-between gap-2"><span className="text-orange-400 text-xs font-bold">N-VEG</span><span className="text-white font-black text-lg">{nv}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-[2rem] overflow-hidden">
                  <div className="px-8 py-5 border-b border-white/5">
                    <h3 className="font-bold text-white">Full Weekly Manifest</h3>
                    <p className="text-neutral-600 text-xs font-mono mt-1">{employees.filter(e=>e.data.isPaid).length} paid · Week of {format(new Date(),'dd MMM yyyy')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/5">
                        {['ID','Shift','Mon','Tue','Wed','Thu','Fri','Txn ID','Paid'].map(h=>(
                          <th key={h} className="px-5 py-3 text-left text-[10px] font-mono font-bold text-neutral-600 uppercase tracking-[0.2em]">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {employees.map(({id,data})=>(
                          <tr key={id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="px-5 py-3 font-mono text-sm font-bold text-white">{id}</td>
                            <td className="px-5 py-3 text-sm text-neutral-400">{data.shift??'—'}</td>
                            {DAYS.map(day=>(
                              <td key={day} className="px-5 py-3">
                                {data.plan ? (
                                  <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-black',
                                    data.plan[day]==='Veg' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                                  )}>{data.plan[day]==='Veg'?'V':'NV'}</span>
                                ) : <span className="text-neutral-700">—</span>}
                              </td>
                            ))}
                            <td className="px-5 py-3 font-mono text-xs text-emerald-400">{data.txnId??'—'}</td>
                            <td className="px-5 py-3">{data.isPaid?<CheckCircle2 size={15} className="text-emerald-400"/>:<XCircle size={15} className="text-neutral-700"/>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ PAYMENT CONFIG ══ */}
            {view==='payment-config' && (
              <motion.div key="payconfig" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <PaymentSettings/>
              </motion.div>
            )}

            {/* ══ SETTINGS ══ */}
            {view==='settings' && (
              <motion.div key="settings" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <div className="max-w-lg">
                  <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8 mb-6">
                    <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Key size={18} className="text-emerald-400"/> Current Credentials</h3>
                    <div className="space-y-3 mt-4">
                      {[{k:'Admin ID',v:loadCreds().id},{k:'Password',v:'•'.repeat(loadCreds().password.length)}].map(({k,v})=>(
                        <div key={k} className="flex justify-between py-3 border-b border-white/5">
                          <span className="text-neutral-500 text-sm">{k}</span>
                          <span className="font-mono font-bold text-white text-sm">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2"><Settings2 size={18} className="text-emerald-400"/> Change Credentials</h3>
                    <div className="space-y-4">
                      {[
                        {label:'New Admin ID', val:newId, set:setNewId, placeholder:`Current: ${loadCreds().id}`, type:'text', mono:true},
                        {label:'New Password', val:newPw, set:setNewPw, placeholder:'Enter new password', type:'password', mono:false},
                        {label:'Confirm Password', val:confirmPw, set:setConfirmPw, placeholder:'Repeat new password', type:'password', mono:false},
                      ].map(f=>(
                        <div key={f.label}>
                          <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-2">{f.label}</label>
                          <input type={f.type} value={f.val} onChange={e=>f.set(f.mono?e.target.value.toUpperCase():e.target.value)} placeholder={f.placeholder}
                            className={cn("w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none text-white placeholder:text-neutral-700 focus:border-emerald-500/50 text-sm", f.mono&&'font-mono')}/>
                        </div>
                      ))}
                      {settingsError && <div className="flex items-center gap-2 text-red-400 text-xs font-mono"><AlertCircle size={13}/>{settingsError}</div>}
                      {settingsSaved && <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono"><CheckCircle2 size={13}/>Saved successfully!</div>}
                      <button onClick={saveCreds} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl">
                        <Save size={15}/> Save Credentials
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedEmp && <EmployeeModal emp={selectedEmp} txns={transactions} onClose={()=>setSelectedEmp(null)}/>}
      </AnimatePresence>
    </div>
  );
}
