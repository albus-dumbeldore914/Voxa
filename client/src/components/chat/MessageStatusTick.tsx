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
      return <Check className="w-3.5 h-3.5 text-sky-200" />;
    case 'DELIVERED':
      return <CheckCheck className="w-3.5 h-3.5 text-sky-200" />;
    case 'READ':
      return <CheckCheck className="w-3.5 h-3.5 text-sky-300 font-bold" />;
    default:
      return null;
  }
};
