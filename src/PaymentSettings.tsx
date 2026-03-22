/**
 * CaterTrack — Admin Payment Settings
 * Admin configures UPI, Card instructions, Bank details, amount, enabled methods.
 * Employees see the result but never this configuration UI.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, Smartphone, Building2, Save, CheckCircle2,
  AlertCircle, IndianRupee, Upload, Trash2, Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PaymentConfig, getPaymentConfig, savePaymentConfig, getUpiQrUrl } from './paymentConfig';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type PayTab = 'general' | 'upi' | 'card' | 'bank';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-1">{label}</label>
      {hint && <p className="text-[11px] text-neutral-600 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', mono = false }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none text-white placeholder:text-neutral-700 focus:border-emerald-500/50 transition-colors text-sm',
        mono && 'font-mono'
      )}
    />
  );
}

function Toggle({ label, checked, onChange, desc }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        {desc && <div className="text-xs text-neutral-500 mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors border',
          checked ? 'bg-emerald-500 border-emerald-400' : 'bg-white/10 border-white/10'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  );
}

export default function PaymentSettings() {
  const [config, setConfig] = useState<PaymentConfig>(getPaymentConfig());
  const [tab, setTab] = useState<PayTab>('general');
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<PaymentConfig>) => setConfig(prev => ({ ...prev, ...patch }));

  const toggleMethod = (method: 'UPI' | 'Card' | 'NetBanking') => {
    const cur = config.enabledMethods;
    const next = cur.includes(method) ? cur.filter(m => m !== method) : [...cur, method];
    if (next.length === 0) return; // at least one must be enabled
    update({ enabledMethods: next });
  };

  const handleSave = () => {
    savePaymentConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs: { id: PayTab; icon: React.ElementType; label: string }[] = [
    { id: 'general',  icon: IndianRupee,  label: 'General' },
    { id: 'upi',      icon: Smartphone,   label: 'UPI' },
    { id: 'card',     icon: CreditCard,   label: 'Card' },
    { id: 'bank',     icon: Building2,    label: 'Bank Transfer' },
  ];

  return (
    <div className="max-w-2xl">

      {/* Live preview banner */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <Info size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-400 leading-relaxed">
          Changes here update what employees see on their payment screen — <span className="text-emerald-400 font-semibold">instantly after Save</span>. Employees cannot see this configuration panel.
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all',
              tab === t.id ? 'bg-emerald-500 text-black' : 'text-neutral-500 hover:text-white'
            )}
          >
            <t.icon size={14} />
            <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── GENERAL ── */}
        {tab === 'general' && (
          <motion.div key="general" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8 mb-6">
              <h3 className="font-bold text-white mb-6">Payment Settings</h3>

              <Field label="Weekly Meal Amount (₹)" hint="This is what employees pay. Shown on their payment screen.">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    value={config.amount}
                    min={1}
                    onChange={e => update({ amount: Number(e.target.value) })}
                    className="w-32 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none text-white font-mono text-lg font-bold focus:border-emerald-500/50 transition-colors"
                  />
                  <span className="text-neutral-500 text-sm">per week</span>
                </div>
              </Field>

              <Field label="Business Name" hint="Shown on payment receipts and confirmation screens.">
                <Input value={config.businessName} onChange={v => update({ businessName: v })} placeholder="Your Company Name" />
              </Field>

              <Field label="Receipt Note" hint="Message shown to employee after successful payment.">
                <textarea
                  value={config.receiptNote}
                  onChange={e => update({ receiptNote: e.target.value })}
                  placeholder="Thank you! Your meal pass is active."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none text-white placeholder:text-neutral-700 focus:border-emerald-500/50 transition-colors text-sm resize-none"
                />
              </Field>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
              <h3 className="font-bold text-white mb-2">Enabled Payment Methods</h3>
              <p className="text-neutral-500 text-xs mb-6">Only enabled methods appear on the employee payment screen.</p>
              <Toggle label="UPI / QR Code" desc="Employees scan QR or pay by UPI ID" checked={config.enabledMethods.includes('UPI')} onChange={() => toggleMethod('UPI')} />
              <Toggle label="Card Payment" desc="Show card payment instructions" checked={config.enabledMethods.includes('Card')} onChange={() => toggleMethod('Card')} />
              <Toggle label="Net Banking / Bank Transfer" desc="Show bank account details for NEFT/IMPS" checked={config.enabledMethods.includes('NetBanking')} onChange={() => toggleMethod('NetBanking')} />
            </div>
          </motion.div>
        )}

        {/* ── UPI ── */}
        {tab === 'upi' && (
          <motion.div key="upi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8 mb-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <Smartphone size={18} className="text-emerald-400" /> UPI Configuration
              </h3>

              <Field label="UPI ID" hint="Your business UPI ID. Employees pay to this ID.">
                <Input value={config.upiId} onChange={v => update({ upiId: v })} placeholder="yourname@okaxis" mono />
              </Field>

              <Field label="Display Name (UPI)" hint="Name shown on employee's UPI app after scanning.">
                <Input value={config.upiName} onChange={v => update({ upiName: v })} placeholder="Your Business Name" />
              </Field>

              {/* QR Upload */}
              <Field label="Upload Your QR Code" hint="Upload your UPI QR image directly. This is shown to employees on the payment screen.">
                <div className="space-y-3">
                  {/* Drop zone */}
                  <label
                    htmlFor="qr-upload"
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                      config.upiQrUrl
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/10 hover:border-emerald-500/30 hover:bg-white/5"
                    )}
                  >
                    {config.upiQrUrl ? (
                      <>
                        <div className="bg-white p-2 rounded-xl">
                          <img src={config.upiQrUrl} alt="Uploaded QR" className="w-32 h-32 object-contain" />
                        </div>
                        <span className="text-emerald-400 text-xs font-bold font-mono">✓ QR Uploaded — click to replace</span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <Upload size={22} className="text-neutral-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white">Click to upload QR image</p>
                          <p className="text-xs text-neutral-500 mt-1">PNG, JPG or WEBP · Max 2MB</p>
                        </div>
                      </>
                    )}
                    <input
                      id="qr-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert('File too large. Max 2MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          update({ upiQrUrl: dataUrl });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  {/* Remove button */}
                  {config.upiQrUrl && (
                    <button
                      onClick={() => update({ upiQrUrl: '' })}
                      className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 font-bold transition-colors"
                    >
                      <Trash2 size={13} /> Remove — use auto-generated QR instead
                    </button>
                  )}

                  {/* Auto-generate note */}
                  {!config.upiQrUrl && (
                    <p className="text-xs text-neutral-600 font-mono">
                      No upload → QR auto-generated from your UPI ID above
                    </p>
                  )}
                </div>
              </Field>

              {/* Live preview — always visible when QR exists */}
              {config.upiQrUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-4 bg-white/5 rounded-2xl border border-white/10"
                >
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-3">Employee will see this:</p>
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-2 rounded-xl">
                      <img src={config.upiQrUrl} alt="QR Preview" className="w-36 h-36 object-contain" />
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-400 font-mono text-sm font-bold">{config.upiId}</div>
                      <div className="text-neutral-500 text-xs mt-1">{config.upiName} · ₹{config.amount}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── CARD ── */}
        {tab === 'card' && (
          <motion.div key="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-400" /> Card Payment Instructions
              </h3>
              <p className="text-neutral-500 text-xs mb-6">
                Since there's no payment gateway, this message tells employees exactly how to pay by card. Shown on their payment screen.
              </p>

              <Field label="Instructions shown to employee">
                <textarea
                  value={config.cardInstructions}
                  onChange={e => update({ cardInstructions: e.target.value })}
                  rows={5}
                  placeholder="e.g. Visit the facility desk with your Employee ID. Pay ₹20 by card. Show the confirmation screen."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none text-white placeholder:text-neutral-700 focus:border-emerald-500/50 transition-colors text-sm resize-none leading-relaxed"
                />
              </Field>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mt-2">
                <p className="text-amber-400 text-xs font-mono font-bold mb-1">NOTE</p>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  After the employee reads these instructions and confirms, the system marks their payment as complete. Make sure your instructions match your actual payment process.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── BANK ── */}
        {tab === 'bank' && (
          <motion.div key="bank" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <Building2 size={18} className="text-emerald-400" /> Bank Transfer Details
              </h3>
              <p className="text-neutral-500 text-xs mb-6">These details are shown to employees who choose Net Banking / NEFT / IMPS.</p>

              <Field label="Bank Name">
                <Input value={config.bankName} onChange={v => update({ bankName: v })} placeholder="HDFC Bank" />
              </Field>
              <Field label="Account Holder Name">
                <Input value={config.bankAccountHolder} onChange={v => update({ bankAccountHolder: v })} placeholder="Your Company Pvt Ltd" />
              </Field>
              <Field label="Account Number">
                <Input value={config.bankAccountNumber} onChange={v => update({ bankAccountNumber: v })} placeholder="50100XXXXXXXXXX" mono />
              </Field>
              <Field label="IFSC Code">
                <Input value={config.bankIFSC} onChange={v => update({ bankIFSC: v })} placeholder="HDFC0001234" mono />
              </Field>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-colors"
        >
          <Save size={16} /> Save Changes
        </button>
        {saved && (
          <motion.div
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-emerald-400 text-sm font-bold"
          >
            <CheckCircle2 size={16} /> Saved — employees see this instantly
          </motion.div>
        )}
      </div>
    </div>
  );
}
