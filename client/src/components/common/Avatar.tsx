import React from 'react';

interface AvatarProps {
  name: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showBadge?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatar,
  size = 'md',
  isOnline = false,
  showBadge = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const badgeSizeClasses = {
    sm: 'w-2.5 h-2.5 right-0 bottom-0 ring-1',
    md: 'w-3 h-3 right-0 bottom-0 ring-2',
    lg: 'w-3.5 h-3.5 right-0.5 bottom-0.5 ring-2',
    xl: 'w-4 h-4 right-1 bottom-1 ring-2',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`relative inline-block select-none ${className}`}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-sky-100 shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 text-white font-bold flex items-center justify-center shadow-sm`}
        >
          {initials}
        </div>
      )}

      {showBadge && (
        <span
          className={`absolute rounded-full ring-white ${badgeSizeClasses[size]} ${
            isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-300'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};
