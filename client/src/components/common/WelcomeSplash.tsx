import React, { useEffect, useState } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { Avatar } from './Avatar';

interface WelcomeSplashProps {
  userName: string;
  avatar?: string;
  onComplete: () => void;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ userName, avatar, onComplete }) => {
  const [stage, setStage] = useState<'enter' | 'active' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('active'), 100);
    const t2 = setTimeout(() => setStage('exit'), 2000);
    const t3 = setTimeout(() => onComplete(), 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950/40 transition-opacity duration-400 ${
        stage === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-sky-200/40 dark:bg-sky-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-200/40 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />

      <div
        className={`relative z-10 flex flex-col items-center text-center p-8 max-w-sm w-full transition-all duration-500 transform ${
          stage === 'enter'
            ? 'scale-90 opacity-0 translate-y-4'
            : stage === 'active'
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-105 opacity-0 -translate-y-2'
        }`}
      >
        {/* Animated Avatar / Logo badge */}
        <div className="relative mb-5">
          <div className="absolute -inset-2 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full blur-sm opacity-60 animate-pulse" />
          <div className="relative p-1 bg-white dark:bg-slate-800 rounded-full shadow-xl">
            <Avatar name={userName} avatar={avatar} size="xl" showBadge={false} />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-tr from-sky-600 to-sky-400 text-white rounded-full shadow-md animate-bounce">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Brand Chip */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100/80 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 rounded-full text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-widest mb-3">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>VOXA</span>
        </div>

        {/* Welcome Text */}
        <h2 className="text-xl font-medium text-slate-600 dark:text-slate-300">
          Welcome,
        </h2>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-500 dark:from-sky-400 dark:to-blue-300 tracking-tight mt-0.5">
          {userName}!
        </h1>

        {/* Tagline */}
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-2">
          Talk. Connect. Belong.
        </p>

        {/* Animated Loading Bar */}
        <div className="w-36 h-1.5 bg-sky-100 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
};
