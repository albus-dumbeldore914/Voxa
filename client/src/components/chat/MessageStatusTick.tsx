import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { MessageStatus } from '../../types';

interface MessageStatusTickProps {
  status: MessageStatus;
  isOutgoing?: boolean;
}

export const MessageStatusTick: React.FC<MessageStatusTickProps> = ({ status, isOutgoing = true }) => {
  if (!isOutgoing) return null;

  switch (status) {
    case 'SENT':
      return (
        <span title="Sent" className="inline-flex items-center">
          <Check className="w-3.5 h-3.5 text-slate-800/60 dark:text-slate-900/70" />
        </span>
      );
    case 'DELIVERED':
      return (
        <span title="Delivered to recipient" className="inline-flex items-center">
          <CheckCheck className="w-3.5 h-3.5 text-slate-800/80 dark:text-slate-900/80" />
        </span>
      );
    case 'READ':
      return (
        <span title="Read by recipient" className="inline-flex items-center">
          <CheckCheck className="w-3.5 h-3.5 text-slate-950 font-bold" />
        </span>
      );
    default:
      return null;
  }
};
