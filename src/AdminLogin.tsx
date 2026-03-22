/**
 * CaterTrack — Admin Login
 * Exact same dark luxury style as App.tsx hero section
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

const DEFAULT_ID = 'ADMIN1';
const DEFAULT_PW  = 'cater@2026';
const CRED_KEY    = 'catertrack_admin_creds';

function getCredentials() {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { id: DEFAULT_ID, password: DEFAULT_PW };
}

export default function AdminLogin({ onLogin }: Props) {
  const [id, setId]     = useState('');
  const [pw, setPw]     = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = getCredentials();
    if (id.trim() === creds.id && pw === creds.password) {
      setError('');
      onLogin();
    } else {
      setError('ACCESS DENIED — Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6 selection:bg-emerald-500/30">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ rotateX: 30, y: 60, opacity: 0 }}
        animate={{ rotateX: 0, y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        {/* Icon */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-emerald-400 to-emerald-600 text-black shadow-[0_0_50px_rgba(16,185,129,0.3)] mb-8"
        >
          <ShieldCheck size={38} />
        </motion.div>

        <h1 className="text-4xl font-display font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          Admin Console
        </h1>
        <p className="text-neutral-500 text-sm mb-10 font-mono tracking-widest uppercase">
          Authorized Personnel Only
        </p>

        <form onSubmit={handle} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-left space-y-5">
          {/* Admin ID */}
          <div>
            <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-2">Admin ID</label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value.toUpperCase())}
              placeholder="ADMIN1"
              maxLength={10}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none text-white placeholder:text-neutral-700 font-mono tracking-widest text-lg focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-2">Password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="••••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-12 outline-none text-white placeholder:text-neutral-700 focus:border-emerald-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono font-bold">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl flex items-center justify-center gap-2 transition-all group mt-2"
          >
            Authenticate <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="text-neutral-700 text-xs mt-8 font-mono">
          Default credentials shown in Admin → Settings
        </p>
      </motion.div>
    </div>
  );
}
