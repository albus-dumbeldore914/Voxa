import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Image as ImageIcon, X } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, mediaUrl?: string) => void;
}

const COMMON_EMOJIS = ['👋', '⚡', '🔥', '💙', '🚀', '✨', '😊', '👍', '🎉', '☕', '🙌', '💯'];

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !imageUrl) return;

    onSendMessage(content.trim(), imageUrl || undefined);
    setContent('');
    setImageUrl('');
    setShowEmoji(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="p-2.5 sm:p-3 md:p-4 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] sm:pb-3 md:pb-4 bg-white/90 dark:bg-[#0E1320]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-[#1A2233] relative transition-colors duration-300 shrink-0">
      {/* Emoji Picker Popup */}
      {showEmoji && (
        <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-auto mb-2 p-3 bg-white dark:bg-[#121724] border border-slate-200 dark:border-[#1F2738] rounded-2xl shadow-xl shadow-black/30 flex flex-wrap gap-2 max-w-full sm:max-w-xs z-30 animate-slide-up">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="text-xl hover:scale-125 active:scale-95 transition-transform p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2233] touch-manipulation"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Image URL preview badge if attached */}
      {imageUrl && (
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-[#00D285]/10 dark:bg-[#00D285]/15 border border-[#00D285]/30 rounded-xl text-xs text-[#00A86B] dark:text-[#00F59B]">
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[180px] sm:max-w-[240px]">Image attached</span>
          <button
            type="button"
            onClick={() => setImageUrl('')}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
        {/* Attachment Toggle */}
        <button
          type="button"
          onClick={() => {
            const sample = prompt('Enter Image URL to attach (or leave blank to cancel):', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80');
            if (sample) setImageUrl(sample);
          }}
          className="p-2 sm:p-2.5 text-slate-400 hover:text-[#00A86B] dark:hover:text-[#00F59B] hover:bg-[#00D285]/10 rounded-xl transition-colors shrink-0"
          title="Attach Image"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className={`p-2 sm:p-2.5 rounded-xl transition-colors shrink-0 ${
            showEmoji ? 'text-[#00A86B] dark:text-[#00F59B] bg-[#00D285]/10' : 'text-slate-400 hover:text-[#00A86B] dark:hover:text-[#00F59B] hover:bg-[#00D285]/10'
          }`}
          title="Insert Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Message Input Field - 16px on mobile prevents iOS viewport auto-zoom */}
        <div className="flex-1 relative min-w-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-3.5 sm:pl-4 pr-3.5 sm:pr-4 py-2.5 bg-slate-100 dark:bg-[#121724] border border-slate-200 dark:border-[#1F2738] text-slate-900 dark:text-slate-100 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00D285]/40 focus:border-[#00D285]/40 focus:bg-white dark:focus:bg-[#151C2C] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!content.trim() && !imageUrl}
          className="p-2.5 sm:p-2.5 bg-[#00D285] hover:bg-[#00BF78] disabled:opacity-30 disabled:hover:bg-[#00D285] text-slate-950 font-bold rounded-xl shadow-md shadow-[#00D285]/20 active:scale-90 transition-all flex items-center justify-center shrink-0"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
