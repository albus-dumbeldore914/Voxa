import React from 'react';

interface BrainBoxLogoProps {
  className?: string;
  size?: number;
}

export const BrainBoxLogo: React.FC<BrainBoxLogoProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D285" />
          <stop offset="50%" stopColor="#00F59B" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* BrainBox clover/neural triskelion nodes */}
      <circle cx="16" cy="16" r="3.5" fill="url(#bb-grad)" />
      <path
        d="M16 6C13.2386 6 11 8.23858 11 11C11 12.4411 11.6087 13.7397 12.5858 14.6569L14.7071 12.5355C14.2612 12.0896 14 11.4764 14 11C14 9.89543 14.8954 9 16 9C17.1046 9 18 9.89543 18 11C18 11.4764 17.7388 12.0896 17.2929 12.5355L19.4142 14.6569C20.3913 13.7397 21 12.4411 21 11C21 8.23858 18.7614 6 16 6Z"
        fill="url(#bb-grad)"
      />
      <path
        d="M7.34 21C5.96 18.6 6.78 15.54 9.17 14.16C10.42 13.44 11.89 13.44 13.1 14.07L11.6 16.67C11.08 16.4 10.45 16.4 9.91 16.71C8.96 17.26 8.63 18.48 9.18 19.43C9.42 19.85 9.85 20.15 10.33 20.24L9.55 23.15C8.67 22.8 7.89 22.04 7.34 21Z"
        fill="url(#bb-grad)"
      />
      <path
        d="M24.66 21C24.11 22.04 23.33 22.8 22.45 23.15L21.67 20.24C22.15 20.15 22.58 19.85 22.82 19.43C23.37 18.48 23.04 17.26 22.09 16.71C21.55 16.4 20.92 16.4 20.4 16.67L18.9 14.07C20.11 13.44 21.58 13.44 22.83 14.16C25.22 15.54 26.04 18.6 24.66 21Z"
        fill="url(#bb-grad)"
      />
    </svg>
  );
};
