import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { MessageStatusTick } from '../chat/MessageStatusTick';
import { NewChatModal } from '../chat/NewChatModal';
import { ProfileModal } from '../chat/ProfileModal';
import { Search, Plus, MessageSquare, Settings } from 'lucide-react';

interface SidebarProps {
  onSelectMobileChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelectMobileChat }) => {
  const { conversations, activeConversation, selectConversation, startNewConversation } = useChat();
  const { user } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.participant.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.lastMessage?.content.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-sky-100 dark:border-slate-800 shrink-0 z-20 transition-colors duration-300">
      {/* Top Brand & Actions Bar */}
      <div className="p-4 border-b border-sky-100 dark:border-slate-800 bg-gradient-to-b from-sky-50/60 to-white dark:from-slate-900/90 dark:to-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-slate-900 dark:text-white tracking-tight text-base">VOXA</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-md">
                Fast
              </span>
            </div>
            <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 -mt-0.5 tracking-tight">
              Talk. Connect. Belong.
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowNewChat(true)}
            className="p-2 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 border border-sky-200/80 dark:border-slate-700 rounded-xl transition-all shadow-xs hover:scale-105 active:scale-95"
            title="Start New Convo"
          >
            <Plus className="w-4 h-4" />
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="p-1 hover:ring-2 hover:ring-sky-400 rounded-full transition-all"
              title="My Profile"
            >
              <Avatar name={user.name} avatar={user.avatar} size="sm" isOnline={true} />
            </button>
          )}
        </div>
      </div>

      {/* ⚠️ Show banner if user's name is still the default */}
      {user && (user.name === 'VOXA User' || !user.name) && (
        <div
          className="mx-3 mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 flex items-center gap-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
          onClick={() => setShowProfile(true)}
        >
          <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Set your display name!</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Tap here → Profile → edit your name so friends can find you.</p>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="p-3 border-b border-sky-50 dark:border-slate-800/80">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chats or messages..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="py-16 text-center px-6">
            <div className="w-16 h-16 bg-sky-50 dark:bg-sky-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-sky-400 dark:text-sky-500" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1">
              {filterQuery ? 'No chats found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              {filterQuery
                ? `No chats match "${filterQuery}"`
                : 'Tap the + button to search for users and start chatting'}
            </p>
            {!filterQuery && (
              <button
                type="button"
                onClick={() => setShowNewChat(true)}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 mx-auto transition-all active:scale-95 shadow-md shadow-sky-500/25"
              >
                <Plus className="w-3.5 h-3.5" />
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const isOutgoing = conv.lastMessage?.senderId === user?.id;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => {
                  selectConversation(conv.id);
                  if (onSelectMobileChat) onSelectMobileChat();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left relative group ${
                  isActive
                    ? 'bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/50 shadow-xs'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {/* Contact Avatar */}
                <Avatar
                  name={conv.participant.name}
                  avatar={conv.participant.avatar}
                  isOnline={conv.participant.isOnline}
                  size="md"
                />

                {/* Info & Last message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className={`font-semibold text-sm truncate ${
                        isActive ? 'text-sky-900 dark:text-sky-300 font-bold' : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {conv.participant.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">
                      {conv.lastMessage?.createdAt || ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                      {isOutgoing && conv.lastMessage && (
                        <MessageStatusTick status={conv.lastMessage.status} isOutgoing={true} />
                      )}
                      <span className="truncate">{conv.lastMessage?.content || 'No messages yet'}</span>
                    </div>

                    {/* Unread Pill */}
                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-600 dark:bg-sky-500 text-white rounded-full min-w-4 text-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Status / Profile Shortcut */}
      <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-sky-100 dark:border-slate-800 bg-sky-50/30 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate font-medium text-slate-600 dark:text-slate-300">{user?.name}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-semibold text-[11px] flex items-center gap-1 shrink-0 p-1"
        >
          <Settings className="w-3.5 h-3.5" /> Settings
        </button>
      </div>

      {/* Modals */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onSelectUser={(u) => {
          startNewConversation(u);
          if (onSelectMobileChat) onSelectMobileChat();
        }}
      />

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </aside>
  );
};
