import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare, Phone, Mail, User as UserIcon, ArrowRight,
  KeyRound, Sparkles, CheckCircle2, ShieldCheck
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { sendOtp, verifyOtp, loginWithGoogle, isLoading } = useAuth();

  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [authMode, setAuthMode] = useState<'google' | 'otp'>('google');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  // ─── Google one-tap login ──────────────────────────────────────────────────
  const handleGoogleSuccess = async (tokenResponse: any) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogle(tokenResponse.access_token);
      if (!res.success) {
        setError(res.message);
      }
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError('Google sign-in was cancelled or failed. Please try again.');
      setGoogleLoading(false);
    },
  });

  // ─── OTP flow ─────────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (!phone.trim() || !email.trim()) {
      setError('Please provide both Phone Number and Email Address');
      return;
    }
    const res = await sendOtp(phone, email, name);
    if (res.success) {
      setStep('otp');
      setTimer(45);
      setCanResend(false);
    } else {
      setError(res.message || 'Failed to send OTP.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);
    if (val && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) setOtp(pasted.split(''));
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
    if (!res.success) setError(res.message);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950/40 p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/50 dark:bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-200/40 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand */}
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

        {/* Card */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-sky-100 dark:border-slate-800 shadow-xl shadow-sky-950/5 dark:shadow-black/40 p-8 transition-colors duration-300">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <span className="font-semibold text-xs uppercase px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/60">Error</span>
              {error}
            </div>
          )}

          {/* ── OTP Verify Step ─────────────────────────────────────────── */}
          {step === 'otp' ? (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Verify Your Identity</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  6-digit OTP sent to <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>
                </p>
              </div>

              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl text-center">
                <p className="text-xs text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  OTP sent — check your email inbox
                </p>
              </div>

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
                      className="w-12 h-13 text-center text-xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-sm"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /><span>Verify & Enter VOXA</span></>}
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <button type="button" onClick={() => setStep('input')} className="hover:text-slate-800 dark:hover:text-slate-200 underline transition-colors">
                  Edit details
                </button>
                {canResend ? (
                  <button type="button" onClick={() => handleSendOtp()} className="text-sky-600 dark:text-sky-400 hover:text-sky-800 font-semibold underline">
                    Resend Code
                  </button>
                ) : (
                  <span>Resend in {timer}s</span>
                )}
              </div>
            </div>

          ) : (
            <div className="space-y-5">
              <div className="text-left mb-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Welcome to VOXA</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to start messaging securely.</p>
              </div>

              {/* ── Google Sign-In (Primary) ─────────────────────────────── */}
              <button
                type="button"
                onClick={() => { setGoogleLoading(true); setError(null); googleLogin(); }}
                disabled={googleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-60 group"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-sky-500 rounded-full animate-spin" />
                ) : (
                  /* Google G icon */
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">or sign in with phone</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* ── OTP Mode Toggle / Form ───────────────────────────────── */}
              {authMode === 'google' ? (
                <button
                  type="button"
                  onClick={() => setAuthMode('otp')}
                  className="w-full py-2.5 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-medium border border-sky-200 dark:border-sky-800/60 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Use Phone + Email OTP instead
                </button>
              ) : (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Your Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><UserIcon className="w-4 h-4" /></div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pawan Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Phone className="w-4 h-4" /></div>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Mail className="w-4 h-4" /></div>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-1 py-3 px-4 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Send Verification Code</span><ArrowRight className="w-4 h-4" /></>}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button type="button" onClick={() => setAuthMode('google')} className="text-xs text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors underline">
                      Back to Google sign-in
                    </button>
                    <button
                      type="button"
                      onClick={() => { setName('Pawan Kumar'); setPhone('+91 98765 43210'); setEmail('pawan@voxa.app'); }}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-800 font-medium inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Demo fill
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>End-to-end encrypted messaging</span>
          <span>•</span>
          <span>VOXA v1.0</span>
        </div>
      </div>
    </div>
  );
};
