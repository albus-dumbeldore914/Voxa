import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { BrainBoxLogo } from '../common/BrainBoxLogo';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import {
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ChatAreaProps {
  onBackToSidebar?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onBackToSidebar }) => {
  const { activeConversation, messages, isTyping, sendMessage, clearChat } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#chat-options-menu') && !target.closest('#chat-options-btn')) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  if (!activeConversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#090B10] p-8 text-center transition-colors duration-300 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00D285]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-[#111726] border border-slate-200 dark:border-[#202C42] flex items-center justify-center mb-5 shadow-xl shadow-[#00D285]/10 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00D285]/30 to-[#38BDF8]/30 rounded-3xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
          <BrainBoxLogo size={36} className="relative z-10" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">VOXA</h3>
          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 bg-[#00D285]/15 text-[#00A86B] dark:text-[#00F59B] border border-[#00D285]/30 rounded-full">
            AI READY
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 tracking-wider uppercase">Talk. Connect. Belong.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
          Select a chat from the sidebar or tap <span className="font-bold text-[#00A86B] dark:text-[#00F59B]">+</span> to search contacts and start an encrypted conversation.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 px-3 py-1.5 bg-slate-100 dark:bg-[#121826] border border-slate-200 dark:border-[#1E2638] rounded-full">
          <ShieldAlert className="w-3.5 h-3.5 text-[#00D285]" />
          <span>Client-side encrypted messaging</span>
        </div>
      </div>
    );
  }

  const { participant } = activeConversation;

  const handleClearChatConfirmed = async () => {
    setShowConfirmClear(false);
    await clearChat(activeConversation.id);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#F8FAFC] dark:bg-[#090B10] relative overflow-hidden transition-colors duration-300">
      {/* Active Conversation Top Header */}
      <div className="h-16 px-3 sm:px-4 md:px-6 bg-white/90 dark:bg-[#0E1320]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1A2233] flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161E2E] rounded-xl transition-colors shrink-0"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            className="cursor-pointer flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1"
            onClick={() => setShowContactInfo(true)}
            title="View contact info"
          >
            <div className="shrink-0">
              <Avatar
                name={participant.name}
                avatar={participant.avatar}
                isOnline={participant.isOnline}
                size="md"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 leading-tight text-sm sm:text-base hover:text-[#00A86B] dark:hover:text-[#00F59B] transition-colors truncate">
                {participant.name}
              </h2>
              <p className="text-[11px] sm:text-xs flex items-center gap-1.5 truncate">
                {participant.isOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#00D285] inline-block shrink-0 shadow-xs shadow-[#00D285]/50 animate-pulse" />
                    <span className="text-[#00A86B] dark:text-[#00F59B] font-medium">Online</span>
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 font-normal truncate">{participant.lastSeen || 'Offline'}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Icons & Dropdown Menu */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-slate-500 dark:text-slate-400 relative shrink-0">
          <button
            type="button"
            onClick={() => alert(`Starting simulated audio call with ${participant.name}...`)}
            className="p-2 hover:text-[#00A86B] dark:hover:text-[#00F59B] hover:bg-[#00D285]/10 rounded-xl transition-colors"
            title="Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => alert(`Starting simulated video call with ${participant.name}...`)}
            className="p-2 hover:text-[#00A86B] dark:hover:text-[#00F59B] hover:bg-[#00D285]/10 rounded-xl transition-colors"
            title="Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Menu Button */}
          <button
            id="chat-options-btn"
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-2 hover:text-[#00A86B] dark:hover:text-[#00F59B] hover:bg-[#00D285]/10 rounded-xl transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div
              id="chat-options-menu"
              className="absolute right-0 top-12 w-48 bg-white dark:bg-[#111724] rounded-2xl shadow-xl border border-slate-200 dark:border-[#212C42] py-1.5 z-30 animate-fade-in text-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowContactInfo(true);
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-[#00D285]/10 hover:text-[#00A86B] dark:hover:text-[#00F59B] transition-colors text-left font-medium"
              >
                <UserIcon className="w-4 h-4 text-[#00D285]" />
                <span>Contact Info</span>
              </button>

              <div className="border-t border-slate-100 dark:border-[#1E2738] my-1" />

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowConfirmClear(true);
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1 bg-[#F8FAFC] dark:bg-[#090B10]">
        {/* End-to-end encryption pill */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#121826] border border-slate-200 dark:border-[#222E42] text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-xs">
            <ShieldAlert className="w-3 h-3 text-[#00D285]" />
            <span>🔒 Ephemeral Privacy • Messages self-destruct on tab reload or exit</span>
          </div>
        </div>

        {/* Empty messages note */}
        {messages.length === 0 && (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
            <p className="font-semibold text-slate-600 dark:text-slate-300">No messages yet</p>
            <p className="mt-1">Say hello to start the conversation with {participant.name}!</p>
          </div>
        )}

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
            <div className="bg-white dark:bg-[#141A28] border border-slate-200 dark:border-[#222E42] rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00D285] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-[#00D285] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-[#00D285] animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar */}
      <MessageInput onSendMessage={sendMessage} />

      {/* Clear Chat Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-950 shadow-2xl w-full max-w-sm p-5 sm:p-6 text-center max-h-[90dvh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">Clear Chat History?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              All messages in your conversation with <span className="font-semibold text-slate-700 dark:text-slate-200">{participant.name}</span> will be permanently deleted.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChatConfirmed}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-red-500/20 transition-colors"
              >
                Yes, Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info Modal */}
      {showContactInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-sky-100 dark:border-slate-800 shadow-2xl w-full max-w-sm p-5 sm:p-6 relative max-h-[90dvh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowContactInfo(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="inline-block mx-auto mb-3">
                <Avatar name={participant.name} avatar={participant.avatar} isOnline={participant.isOnline} size="lg" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{participant.name}</h3>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                {participant.isOnline ? 'Active Now' : participant.lastSeen || 'Offline'}
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone</span>
                <p className="text-slate-800 dark:text-slate-100 font-medium mt-0.5">{participant.phone}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</span>
                <p className="text-slate-800 dark:text-slate-100 font-medium mt-0.5">{participant.email}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bio / Status</span>
                <p className="text-slate-800 dark:text-slate-100 italic mt-0.5">{participant.bio || 'Talk. Connect. Belong.'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowContactInfo(false);
                setShowConfirmClear(true);
              }}
              className="w-full mt-4 py-2.5 px-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear chat history</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
