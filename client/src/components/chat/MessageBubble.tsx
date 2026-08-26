import React from 'react';
import type { Message } from '../../types';
import { MessageStatusTick } from './MessageStatusTick';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOutgoing }) => {
  return (
    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} mb-3`}>
      <div
        className={`max-w-[78%] md:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative transition-all ${
          isOutgoing
            ? 'bg-gradient-to-br from-sky-600 to-sky-500 text-white rounded-tr-xs shadow-sky-600/10'
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-sky-100 dark:border-slate-700/80 rounded-tl-xs shadow-slate-100 dark:shadow-none'
        }`}
      >
        {/* Media Preview if attached */}
        {message.mediaUrl && (
          <div className="mb-2 overflow-hidden rounded-xl">
            <img
              src={message.mediaUrl}
              alt="Attachment"
              className="max-h-60 w-full object-cover rounded-lg hover:opacity-95 cursor-pointer transition-opacity"
            />
          </div>
        )}

        {/* Text Content */}
        <p className="leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>

        {/* Timestamp & Read Receipt */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[11px] font-medium ${
            isOutgoing ? 'text-sky-100' : 'text-slate-400 dark:text-slate-400'
          }`}
        >
          <span>{message.createdAt}</span>
          <MessageStatusTick status={message.status} isOutgoing={isOutgoing} />
        </div>
      </div>
    </div>
  );
};
