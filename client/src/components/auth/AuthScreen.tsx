import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Phone, Mail, User as UserIcon, ArrowRight, KeyRound, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { sendOtp, verifyOtp, isLoading } = useAuth();

  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(45);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!phone.trim() || !email.trim()) {
      setError('Please provide both Phone Number and Email Address');
      return;
    }

    const res = await sendOtp(phone, email, name);
    if (res.success) {
      setDevCode(res.code || null);
      setEmailPreviewUrl(res.emailPreviewUrl || null);
      setStep('otp');
      setTimer(45);
      setCanResend(false);
    } else {
      setError(res.message || 'Failed to send OTP. Make sure the backend server is running.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      setOtp(pasted.split(''));
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const codeStr = otp.join('');

    if (codeStr.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    const res = await verifyOtp(phone || email, codeStr);
    if (!res.success) {
      setError(res.message);
    }
  };

  const fillQuickDemo = () => {
    if (devCode) {
      setOtp(devCode.split(''));
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950/40 p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background Decorative Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/50 dark:bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-200/40 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white shadow-lg shadow-sky-500/25 mb-3 transform hover:scale-105 transition-transform duration-300">
            <MessageSquare className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            VOXA
            <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          </h1>
          <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 tracking-wide mt-1">
            Talk. Connect. Belong.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-sky-100 dark:border-slate-800 shadow-xl shadow-sky-950/5 dark:shadow-black/40 p-8 transition-colors duration-300">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-fade-in">
              <span className="font-semibold text-xs uppercase px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60">Error</span>
              {error}
            </div>
          )}

          {step === 'input' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <div className="text-left mb-4">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Welcome to VOXA</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Connect your phone and email to get your one-time verification code.</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pawan Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Pre-fill */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setName('Pawan Kumar');
                    setPhone('+91 98765 43210');
                    setEmail('pawan@voxa.app');
                  }}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> Quick fill demo credentials
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Verify Your Identity</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  We've sent a 6-digit OTP to <br />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{phone}</span> &amp; <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>
                </p>
              </div>

              {/* Email sent confirmation */}
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl text-center">
                <p className="text-xs text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  OTP sent — check your email inbox
                </p>
              </div>

              {/* 6 Digit Inputs */}
              <form onSubmit={handleVerify}>
                <div className="flex justify-between gap-2 mb-4" onPaste={handlePasteOtp}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-12 h-13 text-center text-xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm"
                    />
                  ))}
                </div>

                {/* Verify Action */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Enter VOXA</span>
                    </>
                  )}
                </button>
              </form>

              {/* Resend and Back actions */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="hover:text-slate-800 dark:hover:text-slate-200 underline transition-colors"
                >
                  Edit phone/email
                </button>

                <div>
                  {canResend ? (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-semibold underline"
                    >
                      Resend Code
                    </button>
                  ) : (
                    <span>Resend in {timer}s</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
          <span>End-to-end encrypted messaging</span>
          <span>•</span>
          <span>VOXA v1.0</span>
        </div>
      </div>
    </div>
  );
};
