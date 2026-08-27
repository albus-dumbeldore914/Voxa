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
          <Check className="w-3.5 h-3.5 text-sky-200/90 dark:text-slate-400" />
        </span>
      );
    case 'DELIVERED':
      return (
        <span title="Delivered to recipient" className="inline-flex items-center">
          <CheckCheck className="w-3.5 h-3.5 text-sky-200 dark:text-slate-300" />
        </span>
      );
    case 'READ':
      return (
        <span title="Read by recipient" className="inline-flex items-center">
          <CheckCheck className="w-3.5 h-3.5 text-cyan-300 dark:text-sky-400 font-bold" />
        </span>
      );
    default:
      return null;
  }
};
