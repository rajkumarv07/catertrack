/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
import { 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Utensils, 
  Sun, 
  Moon, 
  User,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Zap,
  Lock,
  Wallet
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, addHours, parseISO } from 'date-fns';
import { Step, Shift, FoodPreference, WeeklyPlan, saveTransaction, isTxnIdUsed } from './types';
import { getPaymentConfig, getUpiQrUrl, PaymentConfig } from './paymentConfig';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export default function App() {
  const [step, setStep] = useState<Step>('login');
  const [employeeId, setEmployeeId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [shift, setShift] = useState<Shift | null>(null);
  const [plan, setPlan] = useState<WeeklyPlan>({
    monday: 'Veg',
    tuesday: 'Veg',
    wednesday: 'Veg',
    thursday: 'Veg',
    friday: 'Veg',
  });
  const [isPaid, setIsPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'UPI' | 'NetBanking'>('Card');
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    upiId: '',
    bankName: ''
  });
  const [paymentErrors, setPaymentErrors] = useState({
    cardNumber: '', expiry: '', cvv: '', upiId: '', bankName: '', txnId: ''
  });
  const [txnId, setTxnId] = useState('');
  const [terminationRequested, setTerminationRequested] = useState(false);
  const [payConfig, setPayConfig] = useState<PaymentConfig>(getPaymentConfig());

  useEffect(() => {
    setPayConfig(getPaymentConfig());
  }, [step]);
  const [terminationStatus, setTerminationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  // Persistence Logic
  useEffect(() => {
    if (step !== 'login' && employeeId) {
      const userData = {
        shift,
        plan,
        isPaid,
        lastUpdated,
        terminationRequested,
        terminationStatus,
        paymentMethod,
        txnId
      };
      localStorage.setItem(`catertrack_user_${employeeId}`, JSON.stringify(userData));
    }
  }, [shift, plan, isPaid, lastUpdated, terminationRequested, terminationStatus, paymentMethod, step, employeeId]);

  // Poll localStorage every 5s to pick up admin approve/reject
  useEffect(() => {
    if (!employeeId || step !== 'summary') return;
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem(`catertrack_user_${employeeId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.terminationStatus && parsed.terminationStatus !== terminationStatus) {
            setTerminationStatus(parsed.terminationStatus);
          }
          if (parsed.terminationRequested !== undefined) {
            setTerminationRequested(parsed.terminationRequested);
          }
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [employeeId, step, terminationStatus]);

  const heroRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const foodRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation: 6 characters (alphanumeric)
    if (employeeId.trim().length !== 6) {
      setLoginError('Employee ID must be exactly 6 characters.');
      return;
    }
    setLoginError('');
    
    // Load user data if exists
    const savedData = localStorage.getItem(`catertrack_user_${employeeId}`);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setShift(parsed.shift || null);
      setPlan(parsed.plan || {
        monday: 'Veg',
        tuesday: 'Veg',
        wednesday: 'Veg',
        thursday: 'Veg',
        friday: 'Veg',
      });
      setIsPaid(parsed.isPaid || false);
      setLastUpdated(parsed.lastUpdated || null);
      setTerminationRequested(parsed.terminationRequested || false);
      setTerminationStatus(parsed.terminationStatus || null);
      setPaymentMethod(parsed.paymentMethod || 'Card');
      setTxnId(parsed.txnId || '');
      
      if (parsed.isPaid) {
        setStep('summary');
        scrollTo(summaryRef);
      } else {
        setStep('shift');
        scrollTo(shiftRef);
      }
    } else {
      setStep('shift');
      scrollTo(shiftRef);
    }
  };

  const handleShiftSelect = (selectedShift: Shift) => {
    setShift(selectedShift);
    setStep('food');
    scrollTo(foodRef);
  };

  const handleFoodSelect = (day: keyof WeeklyPlan, pref: FoodPreference) => {
    if (isPaid) {
      // Mock 6-hour check: assume meal time is 12:00 PM today for demo purposes
      // In a real app, this would check against the specific day/time of the meal
      const now = new Date();
      const shiftHour = shift === 'Night' ? 21 : 9;
      const nextMeal = new Date();
      nextMeal.setHours(shiftHour, 0, 0, 0);
      if (nextMeal <= now) nextMeal.setDate(nextMeal.getDate() + 1);
      const hoursUntilMeal = (nextMeal.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilMeal < 6) {
        alert(`Protocol: Modifications locked within 6h of meal. Window opens after ${new Date(nextMeal.getTime() - 6*3600000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.`);
        return;
      }
    }
    setPlan(prev => ({ ...prev, [day]: pref }));
  };

  const handleLogout = () => {
    setStep('login');
    setEmployeeId('');
    setShift(null);
    setPlan({
      monday: 'Veg',
      tuesday: 'Veg',
      wednesday: 'Veg',
      thursday: 'Veg',
      friday: 'Veg',
    });
    setIsPaid(false);
    setLastUpdated(null);
    setTerminationRequested(false);
    setPaymentMethod('Card');
    setTxnId('');
    setPaymentData({
      cardNumber: '', expiry: '', cvv: '', upiId: '', bankName: ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const proceedToPayment = () => {
    setStep('payment');
    scrollTo(paymentRef);
  };

  const validatePayment = () => {
    const errors = { cardNumber: '', expiry: '', cvv: '', upiId: '', bankName: '', txnId: '' };
    let isValid = true;

    // Transaction ID — required for all methods, must be unique
    const tid = txnId.trim();
    if (tid.length < 6) {
      errors.txnId = 'Enter your transaction/UTR ID (min 6 characters)';
      isValid = false;
    } else if (isTxnIdUsed(tid)) {
      errors.txnId = 'This transaction ID has already been used. Contact admin if this is an error.';
      isValid = false;
    }

    if (paymentMethod === 'Card') {
      if (!/^\d{16}$/.test(paymentData.cardNumber.replace(/\s/g, ''))) {
        errors.cardNumber = 'Invalid card number (16 digits required)';
        isValid = false;
      }
      if (!/^\d{2}\/\d{2}$/.test(paymentData.expiry)) {
        errors.expiry = 'Use MM/YY format';
        isValid = false;
      } else {
        const [month] = paymentData.expiry.split('/').map(Number);
        if (month < 1 || month > 12) { errors.expiry = 'Invalid month'; isValid = false; }
      }
      if (!/^\d{3,4}$/.test(paymentData.cvv)) {
        errors.cvv = 'Invalid CVV'; isValid = false;
      }
    } else if (paymentMethod === 'UPI') {
      // Accept any non-empty UPI ref — user may enter transaction ref, not just UPI ID
      if (paymentData.upiId.trim().length < 3) {
        errors.upiId = 'Enter your UPI transaction reference'; isValid = false;
      }
    } else if (paymentMethod === 'NetBanking') {
      if (paymentData.bankName.trim().length < 3) {
        errors.bankName = 'Enter your bank transaction reference'; isValid = false;
      }
    }

    setPaymentErrors(errors);
    return isValid;
  };

  const handlePayment = () => {
    if (!validatePayment()) return;
    
    setIsPaying(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      const tid = txnId.trim();
      // Save transaction to global store
      saveTransaction({
        txnId: tid,
        method: paymentMethod as 'Card' | 'UPI' | 'NetBanking',
        amount: payConfig.amount,
        timestamp: now,
        employeeId,
        status: 'pending',
        refundStatus: 'none',
      });
      setIsPaid(true);
      setIsPaying(false);
      setLastUpdated(now);
      setStep('summary');
      scrollTo(summaryRef);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Global Progress Bar & Navigation Stepper */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-emerald-500 origin-left z-[100]"
        style={{ scaleX }}
      />
      
      {step !== 'login' && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] glass-dark px-8 py-3 rounded-full border border-white/10 flex items-center gap-6"
        >
          {[
            { id: 'shift', icon: Sun, label: 'Shift', ref: shiftRef },
            { id: 'food', icon: Utensils, label: 'Meal', ref: foodRef },
            { id: 'payment', icon: CreditCard, label: 'Pay', ref: paymentRef },
            { id: 'summary', icon: CheckCircle2, label: 'Done', ref: summaryRef }
          ].filter(s => !(s.id === 'payment' && isPaid)).map((s, i, filteredArray) => {
            const stepOrder = ['shift', 'food', 'payment', 'summary'];
            const currentIndex = stepOrder.indexOf(step);
            const itemIndex = stepOrder.indexOf(s.id);
            
            const isActive = step === s.id;
            const isPast = currentIndex > itemIndex;
            const canNavigate = isPast; // Strict backtracking only

            return (
              <button 
                key={s.id} 
                onClick={() => {
                  if (canNavigate) {
                    setStep(s.id as Step);
                    scrollTo(s.ref);
                  }
                }}
                disabled={!canNavigate}
                className={cn(
                  "flex items-center gap-2 group/nav transition-opacity",
                  !canNavigate && !isActive && "opacity-40"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all border",
                  isActive ? "bg-emerald-500 border-emerald-500 text-black scale-110" : 
                  isPast ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : 
                  "bg-white/5 border-white/10 text-neutral-600",
                  canNavigate && "cursor-pointer hover:border-emerald-500/50"
                )}>
                  <s.icon size={14} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest hidden md:block",
                  isActive ? "text-white" : "text-neutral-600",
                  canNavigate && "group-hover/nav:text-emerald-400"
                )}>
                  {s.label}
                </span>
                {i < filteredArray.length - 1 && <div className="w-4 h-px bg-white/10 ml-2 hidden md:block" />}
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      {/* Hero / Login Section */}
      <section ref={heroRef} className="h-screen flex flex-col items-center justify-center relative perspective-1000 px-6">
        <motion.div 
          initial={{ rotateX: 45, y: 100, opacity: 0 }}
          animate={{ rotateX: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="z-10 text-center max-w-2xl"
        >
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-12 inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_50px_rgba(16,185,129,0.3)] preserve-3d"
          >
            <Utensils size={48} />
          </motion.div>
          
          <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            CaterTrack
          </h1>
          <p className="text-neutral-400 text-xl md:text-2xl font-light tracking-wide mb-12 max-w-lg mx-auto">
            Next-generation food logistics for the modern enterprise.
          </p>

          <motion.form 
            onSubmit={handleLogin}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="glass-dark p-2 rounded-[2.5rem] flex flex-col md:flex-row gap-2 max-w-md mx-auto w-full group focus-within:ring-2 ring-emerald-500/50 transition-all relative"
          >
            <div className="flex-1 relative flex items-center px-6 py-4">
              <User className="text-emerald-500 mr-3" size={20} />
              <input
                type="text"
                placeholder="Employee ID (6 Chars)"
                value={employeeId}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 6);
                  setEmployeeId(val);
                }}
                className="bg-transparent border-none outline-none w-full text-lg font-medium placeholder:text-neutral-600"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-[2rem] transition-all flex items-center justify-center gap-2 group/btn"
            >
              Access
              <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
            {loginError && (
              <div className="absolute -bottom-10 left-6 text-red-400 text-xs font-bold flex items-center gap-1">
                <AlertCircle size={14} /> {loginError}
              </div>
            )}
          </motion.form>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-neutral-600"
        >
          <ChevronDown size={40} strokeWidth={1} />
        </motion.div>
      </section>

      {/* Shift Selection Section */}
      <section 
        ref={shiftRef}
        className={cn(
          "min-h-screen flex flex-col items-center justify-center px-6 py-32 transition-all duration-1000",
          step === 'login' ? "opacity-0 translate-y-20 scale-95" : "opacity-100 translate-y-0 scale-100"
        )}
      >
        <div className="max-w-5xl w-full">
          <div className="mb-20 text-center">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-emerald-500 font-mono text-sm tracking-[0.3em] uppercase mb-4 block"
            >
              Phase 01
            </motion.span>
            <h2 className="text-5xl md:text-7xl font-display font-bold mb-6">Operational Shift</h2>
            <div className="h-1 w-24 bg-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 perspective-1000">
            {[
              { id: 'Morning', icon: Sun, time: '09:00 — 18:00', desc: 'Daylight Operations', color: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-500/20' },
              { id: 'Night', icon: Moon, time: '21:00 — 06:00', desc: 'Nocturnal Cycle', color: 'from-indigo-500/20 to-indigo-500/5', border: 'border-indigo-500/20' }
            ].map((s) => (
              <motion.button
                key={s.id}
                whileHover={{ rotateY: 15, rotateX: -10, scale: 1.05, z: 50 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleShiftSelect(s.id as Shift)}
                className={cn(
                  "relative p-12 rounded-[3rem] border-2 transition-all text-left overflow-hidden preserve-3d glass-dark",
                  shift === s.id ? "border-emerald-500 ring-4 ring-emerald-500/20" : "border-white/5 hover:border-white/10"
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", s.color)} />
                <div className="relative z-10">
                  <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mb-8 bg-black/40 border", s.border)}>
                    <s.icon size={36} className={shift === s.id ? "text-emerald-400" : "text-white/50"} />
                  </div>
                  <h3 className="text-4xl font-display font-bold mb-2">{s.id}</h3>
                  <p className="text-neutral-500 font-mono text-sm tracking-widest mb-6">{s.time}</p>
                  <p className="text-neutral-400 font-light">{s.desc}</p>
                </div>
                {shift === s.id && (
                  <motion.div 
                    layoutId="active-shift"
                    className="absolute top-8 right-8 text-emerald-500"
                  >
                    <CheckCircle2 size={32} />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Food Selection Section */}
      <section 
        ref={foodRef}
        className={cn(
          "min-h-screen flex flex-col items-center justify-center px-6 py-32 transition-all duration-1000",
          (step === 'login' || step === 'shift') ? "opacity-0 translate-y-20" : "opacity-100 translate-y-0"
        )}
      >
        <div className="max-w-6xl w-full">
          <div className="mb-20 text-center">
            <span className="text-emerald-500 font-mono text-sm tracking-[0.3em] uppercase mb-4 block">Phase 02</span>
            <h2 className="text-5xl md:text-7xl font-display font-bold mb-6">Meal Configuration</h2>
            <p className="text-neutral-500 text-xl font-light">Configure your weekly nutritional requirements.</p>
          </div>

          <div className="glass-dark rounded-[4rem] p-12 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap size={120} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 relative z-10">
              {DAYS.map((day, idx) => (
                <motion.div 
                  key={day} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between lg:justify-center gap-3">
                    <div className="h-px flex-1 bg-white/10 lg:hidden" />
                    <h4 className="font-display font-bold text-2xl capitalize text-white/90">{day}</h4>
                    <div className="h-px flex-1 bg-white/10 lg:hidden" />
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {(['Veg', 'Non-Veg'] as FoodPreference[]).map((pref) => (
                      <button
                        key={pref}
                        onClick={() => handleFoodSelect(day, pref)}
                        className={cn(
                          "py-6 px-4 rounded-[2rem] border-2 font-bold transition-all text-sm preserve-3d",
                          plan[day] === pref
                            ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-105"
                            : "bg-white/5 border-white/5 text-neutral-500 hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div 
              className="mt-20 flex flex-col md:flex-row items-center justify-between p-10 bg-black/40 rounded-[3rem] border border-white/5 gap-8"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Clock size={32} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">6-Hour Protocol</p>
                  <p className="text-neutral-500 font-light">Modification window closes 360 minutes prior to delivery.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isPaid) {
                    setStep('summary');
                    scrollTo(summaryRef);
                  } else {
                    proceedToPayment();
                  }
                }}
                className="w-full md:w-auto px-12 py-6 bg-white text-black rounded-[2rem] font-black text-lg hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 group"
              >
                {isPaid ? 'Update Manifest' : 'Lock Schedule'}
                <Lock size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Payment Section - Advanced 3D Interface */}
      <section 
        ref={paymentRef}
        className={cn(
          "min-h-screen flex flex-col items-center justify-center px-6 py-32 transition-all duration-1000",
          (step !== 'payment' && step !== 'summary') ? "opacity-0 translate-y-20" : "opacity-100 translate-y-0"
        )}
      >
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="text-left">
            <span className="text-emerald-500 font-mono text-sm tracking-[0.3em] uppercase mb-4 block">Phase 03</span>
            <h2 className="text-5xl md:text-7xl font-display font-bold mb-8 leading-tight">Secure Token Exchange</h2>
            <p className="text-neutral-400 text-xl font-light mb-10 leading-relaxed">
              Finalize your weekly allocation by processing the mandatory maintenance token.
            </p>
            <div className="space-y-6">
              {[
                { icon: ShieldCheck, text: 'End-to-end encrypted' },
                { icon: Zap, text: 'Instant confirmation' },
                { icon: Wallet, text: 'Corporate wallet compatible' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-neutral-300">
                  <item.icon size={24} className="text-emerald-500" />
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="perspective-1000">
            <motion.div 
              whileHover={{ rotateY: 15, rotateX: -10 }}
              className="glass p-1 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] preserve-3d"
            >
              <div className="bg-[#111] rounded-[3.8rem] p-10 relative overflow-hidden">
                {/* Card Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,#10b981,transparent)]" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-16">
                    <div className="w-16 h-12 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg border border-white/10" />
                    <CreditCard size={40} className="text-white/20" />
                  </div>

                  <div className="mb-12">
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mb-2">Transaction Value</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-display font-bold text-white">₹{payConfig.amount}</span>
                      <span className="text-neutral-500 font-light">.00</span>
                    </div>
                  </div>

            <div className="space-y-6 mb-12">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-neutral-500 text-sm">Employee</span>
                <span className="font-mono font-bold text-emerald-400">{employeeId}</span>
              </div>

              {/* Transaction ID — required for all methods */}
              <div className="mb-4">
                <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest mb-2">
                  Transaction / UTR ID <span className="text-red-400">*</span>
                </p>
                <input
                  type="text"
                  placeholder="Enter your payment transaction ID (e.g. T2603XXXXXXX)"
                  value={txnId}
                  onChange={e => setTxnId(e.target.value.trim().toUpperCase())}
                  className={cn(
                    "w-full bg-white/5 border rounded-2xl px-5 py-3 outline-none transition-all placeholder:text-neutral-700 font-mono text-sm",
                    paymentErrors.txnId ? "border-red-500/50" : "border-white/10 focus:border-emerald-500/50"
                  )}
                />
                {paymentErrors.txnId ? (
                  <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px] uppercase tracking-wider font-bold">
                    <AlertCircle size={10} /> {paymentErrors.txnId}
                  </div>
                ) : (
                  <p className="text-neutral-700 text-[10px] font-mono mt-1">
                    After paying via UPI/Card/Bank — copy the unique transaction ID from your payment app and paste it here.
                  </p>
                )}
              </div>

              {/* Payment Mode Selection — admin-controlled */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-6">
                {(payConfig.enabledMethods).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMethod(mode as 'Card' | 'UPI' | 'NetBanking')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                      paymentMethod === mode ? "bg-emerald-500 text-black" : "text-neutral-500 hover:text-white"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              
              {/* Payment Inputs */}
              <div className="space-y-4">
                {paymentMethod === 'Card' && (
                  <>
                    {payConfig.cardInstructions && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-2">
                        <p className="text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-1">Payment Instructions</p>
                        <p className="text-neutral-300 text-xs leading-relaxed">{payConfig.cardInstructions}</p>
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Card Number (16 digits)"
                        value={paymentData.cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                          setPaymentData(prev => ({ ...prev, cardNumber: val }));
                        }}
                        className={cn(
                          "w-full bg-white/5 border rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-neutral-600",
                          paymentErrors.cardNumber ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-emerald-500/50"
                        )}
                      />
                      {paymentErrors.cardNumber && (
                        <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px] uppercase tracking-wider font-bold">
                          <AlertCircle size={10} /> {paymentErrors.cardNumber}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={paymentData.expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                            setPaymentData(prev => ({ ...prev, expiry: val }));
                          }}
                          className={cn(
                            "w-full bg-white/5 border rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-neutral-600",
                            paymentErrors.expiry ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-emerald-500/50"
                          )}
                        />
                        {paymentErrors.expiry && (
                          <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px] uppercase tracking-wider font-bold">
                            <AlertCircle size={10} /> {paymentErrors.expiry}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="CVV"
                          value={paymentData.cvv}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                            setPaymentData(prev => ({ ...prev, cvv: val }));
                          }}
                          className={cn(
                            "w-full bg-white/5 border rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-neutral-600",
                            paymentErrors.cvv ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-emerald-500/50"
                          )}
                        />
                        {paymentErrors.cvv && (
                          <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px] uppercase tracking-wider font-bold">
                            <AlertCircle size={10} /> {paymentErrors.cvv}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === 'UPI' && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3 p-5 bg-white/5 rounded-[2rem] border border-white/10">
                      <div className="bg-white p-2 rounded-xl">
                        <img src={getUpiQrUrl(payConfig)} alt="UPI QR" className="w-36 h-36"/>
                      </div>
                      <div className="text-center">
                        <div className="text-emerald-400 font-mono text-sm font-bold">{payConfig.upiId}</div>
                        <div className="text-neutral-500 text-xs mt-1">{payConfig.upiName} · ₹{payConfig.amount}</div>
                      </div>
                      <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Scan QR or pay to UPI ID above</p>
                    </div>
                    <div className="relative">
                      <input type="text" placeholder="Your UPI ID or transaction ref"
                        value={paymentData.upiId}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, upiId: e.target.value }))}
                        className={cn("w-full bg-white/5 border rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-neutral-600",
                          paymentErrors.upiId ? "border-red-500/50" : "border-white/10 focus:border-emerald-500/50")}
                      />
                      {paymentErrors.upiId && (
                        <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px] uppercase tracking-wider font-bold">
                          <AlertCircle size={10} /> {paymentErrors.upiId}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === 'NetBanking' && (
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-3">
                      {[
                        { k: 'Bank',           v: payConfig.bankName },
                        { k: 'Account Name',   v: payConfig.bankAccountHolder },
                        { k: 'Account Number', v: payConfig.bankAccountNumber },
                        { k: 'IFSC',           v: payConfig.bankIFSC },
                        { k: 'Amount',         v: `₹${payConfig.amount}` },
                      ].map(({ k, v }) => (
                        <div key={k} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                          <span className="text-neutral-500 text-xs">{k}</span>
                          <span className="font-mono text-sm font-bold text-white">{v}</span>
                        </div>
                      ))}
                    </div>
                    <input type="text" placeholder="Enter transaction / UTR reference"
                      value={paymentData.bankName}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, bankName: e.target.value }))}
                      className={cn("w-full bg-white/5 border rounded-2xl px-6 py-4 outline-none transition-all placeholder:text-neutral-600",
                        paymentErrors.bankName ? "border-red-500/50" : "border-white/10 focus:border-emerald-500/50")}
                    />
                    {paymentErrors.bankName && (
                      <div className="flex items-center gap-1 mt-1 text-red-400 text-[10px] uppercase tracking-wider font-bold">
                        <AlertCircle size={10} /> {paymentErrors.bankName}
                      </div>
                    )}
                  </div>
                )}
              </div>

                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-neutral-500 text-sm">Asset</span>
                      <span className="font-bold">Weekly Meal Pass</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={isPaying || isPaid}
                    className={cn(
                      "w-full py-6 rounded-[2rem] font-black text-xl transition-all relative overflow-hidden group",
                      isPaid 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-emerald-500 text-black hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {isPaying ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-4 border-black border-t-transparent rounded-full mx-auto"
                      />
                    ) : isPaid ? (
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle2 size={28} />
                        Authorized
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        Process Payment
                        <ArrowRight size={24} />
                      </div>
                    )}
                    
                    {!isPaid && !isPaying && (
                      <motion.div 
                        className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                        style={{ skewX: -20 }}
                      />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Summary Section - Immersive Media Style */}
      <section 
        ref={summaryRef}
        className={cn(
          "min-h-screen flex flex-col items-center justify-center px-6 py-32 transition-all duration-1000 relative",
          step !== 'summary' ? "opacity-0 translate-y-20" : "opacity-100 translate-y-0"
        )}
      >
        {/* Immersive Background for Summary */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-emerald-500/20 to-transparent blur-[150px]" />
        </div>

        <div id="summary-content" className="max-w-6xl w-full relative z-10">
          {terminationRequested && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={cn(
                "max-w-md mx-auto mb-16 p-8 glass-dark rounded-[2.5rem] relative overflow-hidden",
                terminationStatus === 'approved' ? "border border-emerald-500/40 shadow-[0_20px_50px_rgba(16,185,129,0.1)]"
                : terminationStatus === 'rejected' ? "border border-neutral-500/30"
                : "border border-red-500/30 shadow-[0_20px_50px_rgba(239,68,68,0.1)]"
              )}
            >
              <div className={cn(
                "absolute top-0 left-0 w-full h-1.5",
                terminationStatus === 'approved' ? "bg-emerald-500"
                : terminationStatus === 'rejected' ? "bg-neutral-500"
                : "bg-gradient-to-r from-red-500/50 via-red-500 to-red-500/50"
              )} />
              
              <div className="flex items-start gap-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border",
                  terminationStatus === 'approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : terminationStatus === 'rejected' ? "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {terminationStatus === 'approved' ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      terminationStatus === 'approved' ? "bg-emerald-500"
                      : terminationStatus === 'rejected' ? "bg-neutral-500"
                      : "bg-red-500 animate-pulse"
                    )} />
                    <h3 className={cn(
                      "text-sm font-mono font-bold uppercase tracking-[0.2em]",
                      terminationStatus === 'approved' ? "text-emerald-400"
                      : terminationStatus === 'rejected' ? "text-neutral-400"
                      : "text-red-400"
                    )}>
                      {terminationStatus === 'approved' ? 'Refund Approved ✓'
                       : terminationStatus === 'rejected' ? 'Request Rejected'
                       : 'Termination Ticket'}
                    </h3>
                  </div>
                  <p className="text-neutral-300 text-sm font-medium leading-relaxed mb-4">
                    {terminationStatus === 'approved'
                      ? 'Your refund has been approved by admin. Amount will be reverted to your original payment method within 3–5 working days.'
                      : terminationStatus === 'rejected'
                      ? 'Your termination request was not approved. Contact your facility manager for assistance.'
                      : 'Your request is under review. Admin will approve or reject shortly.'}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    <span>Status: {terminationStatus?.toUpperCase() ?? 'PENDING'}</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 left-0 w-full flex justify-around">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-[#0a0a0a] border border-white/5" />
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={step === 'summary' ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-center mb-24"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-flex items-center justify-center w-32 h-32 rounded-[3rem] bg-emerald-500/10 text-emerald-400 mb-10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <CheckCircle2 size={64} />
            </motion.div>
            <h2 className="text-6xl md:text-8xl font-display font-bold mb-6 tracking-tighter">Mission Success</h2>
            <p className="text-neutral-400 text-2xl font-light">Your logistical pipeline is fully operational.</p>
            {payConfig.receiptNote && (
              <p className="text-emerald-400/70 text-sm font-mono mt-4 max-w-md mx-auto">{payConfig.receiptNote}</p>
            )}
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-20">
            {DAYS.map((day, idx) => (
              <motion.div
                key={day}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={step === 'summary' ? { rotateY: 0, opacity: 1 } : {}}
                transition={{ delay: 0.1 * idx, duration: 0.8 }}
                className="glass-dark p-10 rounded-[3rem] text-center border border-white/5 hover:border-emerald-500/30 transition-colors group preserve-3d"
              >
                <p className="text-neutral-500 text-xs font-mono uppercase tracking-[0.3em] mb-6">{day}</p>
                <div className={cn(
                  "inline-block px-6 py-2 rounded-full text-xs font-black uppercase mb-8 tracking-widest",
                  plan[day] === 'Veg' ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"
                )}>
                  {plan[day]}
                </div>
                <div className="flex justify-center">
                  <Utensils size={32} className="text-neutral-700 group-hover:text-emerald-500/50 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-dark p-12 rounded-[4rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center text-neutral-500 border border-white/10">
                <Clock size={36} />
              </div>
              <div>
                <p className="text-2xl font-bold mb-1">System Timestamp</p>
                <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">
                  {lastUpdated ? format(parseISO(lastUpdated), 'PPP p') : 'Pending Synchronization'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {!terminationRequested ? (
                <button 
                  onClick={() => {
                    const ref = `TR-${employeeId}-${Date.now().toString().slice(-6)}`;
                    setTerminationRequested(true);
                    setTerminationStatus('pending');
                    const key = `catertrack_user_${employeeId}`;
                    try {
                      const raw = localStorage.getItem(key);
                      if (raw) {
                        const parsed = JSON.parse(raw);
                        parsed.terminationRequested = true;
                        parsed.terminationRef = ref;
                        parsed.terminationStatus = 'pending';
                        localStorage.setItem(key, JSON.stringify(parsed));
                      }
                    } catch {}
                  }}
                  className="px-10 py-5 rounded-[2rem] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-bold tracking-wide"
                >
                  Request Termination
                </button>
              ) : terminationStatus === 'approved' ? (
                <div className="px-10 py-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-bold text-sm flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  <p className="uppercase tracking-tighter">Refund Approved</p>
                </div>
              ) : terminationStatus === 'rejected' ? (
                <div className="px-10 py-5 rounded-[2rem] bg-neutral-500/10 border border-neutral-500/30 text-neutral-400 font-bold text-sm flex items-center gap-2">
                  <AlertCircle size={18} />
                  <p className="uppercase tracking-tighter">Request Rejected</p>
                </div>
              ) : (
                <div className="px-10 py-5 rounded-[2rem] bg-red-500/10 border border-red-500/50 text-red-400 font-bold text-sm flex items-center gap-2">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full"
                  />
                  <p className="uppercase tracking-tighter">Pending Admin Review</p>
                </div>
              )}
              <button 
                onClick={() => {
                  // 6-hour rule: block only if within 6hrs of the NEXT upcoming meal slot
                  // For demo: meal slots are 9am (morning) and 9pm (night)
                  const now = new Date();
                  const shiftHour = shift === 'Night' ? 21 : 9;
                  const nextMeal = new Date();
                  nextMeal.setHours(shiftHour, 0, 0, 0);
                  if (nextMeal <= now) nextMeal.setDate(nextMeal.getDate() + 1);
                  const hoursUntilMeal = (nextMeal.getTime() - now.getTime()) / (1000 * 60 * 60);
                  if (hoursUntilMeal < 6) {
                    alert(`Protocol: Next meal in ${hoursUntilMeal.toFixed(1)}h. Changes locked within 6h window. Try after ${new Date(nextMeal.getTime() - 6*3600000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.`);
                  } else {
                    setStep('food');
                    scrollTo(foodRef);
                  }
                }}
                className="px-10 py-5 rounded-[2rem] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all font-bold tracking-wide"
              >
                Reconfigure Plan
              </button>
              <button 
                onClick={() => {
                  // Better print handling
                  const printContent = document.getElementById('summary-content');
                  if (printContent) {
                    window.print();
                  } else {
                    alert("Manifest Exported: Weekly plan saved to local storage.");
                  }
                }}
                className="px-10 py-5 rounded-[2rem] bg-white text-black hover:bg-emerald-400 transition-all font-black tracking-wide"
              >
                Export Manifest
              </button>
              <button 
                onClick={handleLogout}
                className="px-10 py-5 rounded-[2rem] border border-white/10 hover:bg-white/5 transition-all font-bold tracking-wide"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="py-20 text-center border-t border-white/5">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-neutral-600 font-mono text-[10px] uppercase tracking-[0.5em]">System Online</span>
        </div>
        <p className="text-neutral-700 text-xs font-light">© 2026 CaterTrack Logistics. All rights reserved.</p>
      </footer>
    </div>
  );
}
