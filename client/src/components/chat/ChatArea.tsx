import React, { useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Phone, Video, MoreVertical, MessageSquareDashed, ArrowLeft, ShieldAlert } from 'lucide-react';

interface ChatAreaProps {
  onBackToSidebar?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onBackToSidebar }) => {
  const { activeConversation, messages, isTyping, sendMessage } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!activeConversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50/50 to-sky-50/30 dark:from-slate-950/50 dark:to-slate-900/50 p-8 text-center transition-colors duration-300">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center mb-5 shadow-xl shadow-sky-500/20">
          <MessageSquareDashed className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">VOXA</h3>
        <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-4">Talk. Connect. Belong.</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
          Select a conversation from the sidebar, or tap <span className="font-bold text-sky-600 dark:text-sky-400">+</span> to search for users and start a new chat.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>End-to-end encrypted messaging</span>
        </div>
      </div>
    );
  }

  const { participant } = activeConversation;

  return (
    <div className="flex-1 h-full flex flex-col bg-[#fcfdfe] dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
      {/* Active Conversation Top Header */}
      <div className="h-16 px-4 md:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-sky-100 dark:border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <Avatar
            name={participant.name}
            avatar={participant.avatar}
            isOnline={participant.isOnline}
            size="md"
          />

          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 leading-tight text-sm md:text-base">
              {participant.name}
            </h2>
            <p className="text-xs flex items-center gap-1.5">
              {participant.isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 font-normal">{participant.lastSeen || 'Offline'}</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => alert(`Starting simulated audio call with ${participant.name}...`)}
            className="p-2 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => alert(`Starting simulated video call with ${participant.name}...`)}
            className="p-2 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => alert(`Contact details:\nPhone: ${participant.phone}\nEmail: ${participant.email}\nBio: ${participant.bio || 'None'}`)}
            className="p-2 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Conversation Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1 bg-gradient-to-b from-sky-50/20 via-white to-sky-50/10 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950">
        {/* End-to-end encryption pill */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/60 text-[11px] font-medium text-sky-700 dark:text-sky-300 shadow-xs">
            <ShieldAlert className="w-3 h-3 text-sky-500" />
            <span>Talk. Connect. Belong. • Messages are private & secure</span>
          </div>
        </div>

        {/* Message bubbles */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOutgoing={msg.senderId === user?.id}
          />
        ))}

        {/* Typing indicator bubble */}
        {isTyping && (
          <div className="flex items-center gap-2 mb-3 animate-fade-in">
            <Avatar name={participant.name} avatar={participant.avatar} size="sm" showBadge={false} />
            <div className="bg-white dark:bg-slate-800 border border-sky-100 dark:border-slate-700 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar */}
      <MessageInput onSendMessage={sendMessage} />
    </div>
  );
};
