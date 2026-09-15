import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';
import { Avatar } from '../common/Avatar';
import { Search, X, MessageSquarePlus, UserPlus, Loader2, Users } from 'lucide-react';
import { apiClient } from '../../api/apiClient';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onSelectUser }) => {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all registered users when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setQuery('');
    setIsLoading(true);

    const loadUsers = async () => {
      try {
        const res = await apiClient.get('/users');
        if (res.data?.users) {
          const list = res.data.users.filter((u: User) => u.id !== currentUser?.id);
          setAllUsers(list);
          setFilteredUsers(list);
        }
      } catch (err) {
        console.warn('[NewChatModal] Failed to load users:', err);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    loadUsers();
  }, [isOpen, currentUser?.id]);

  // Filter in real-time as user types
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFilteredUsers(allUsers);
      return;
    }

    const matched = allUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.bio && u.bio.toLowerCase().includes(q))
    );

    setFilteredUsers(matched);
  }, [query, allUsers]);

  const handleSelect = (user: User) => {
    onSelectUser(user);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#0E1320] rounded-3xl border border-slate-200 dark:border-[#1A2233] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85dvh] transition-colors duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-[#1A2233] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#00D285]/15 text-[#00A86B] dark:text-[#00F59B] border border-[#00D285]/30 rounded-xl">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">New Conversation</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Pick a registered contact to start chatting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2233] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-200/60 dark:border-[#1A2233]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, phone or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#121724] border border-slate-200 dark:border-[#1F2738] text-slate-900 dark:text-slate-100 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00D285]/40 focus:border-[#00D285]/40 focus:bg-white dark:focus:bg-[#151C2C] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00D285]" />
              Loading registered users...
            </div>
          ) : allUsers.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="w-14 h-14 bg-slate-100 dark:bg-[#131A28] border border-slate-200 dark:border-[#212C42] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-[#00D285]" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No other users registered yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                Have your friend log in on VOXA — they will immediately show up here!
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">No users found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                No contact matches "<span className="font-medium">{query}</span>"
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                {filteredUsers.length} contact{filteredUsers.length !== 1 ? 's' : ''} available
              </p>
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#00D285]/10 dark:hover:bg-[#131A28] transition-all text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} avatar={u.avatar} isOnline={u.isOnline} size="md" />
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-[#00A86B] dark:group-hover:text-[#00F59B] transition-colors">
                        {u.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {u.phone && <span>{u.phone}</span>}
                        {u.phone && u.email && <span className="mx-1">•</span>}
                        {u.email && <span>{u.email}</span>}
                      </p>
                      {u.bio && <p className="text-[11px] text-slate-400 italic mt-0.5">{u.bio}</p>}
                    </div>
                  </div>
                  <div className="p-2 bg-[#00D285]/15 text-[#00A86B] dark:text-[#00F59B] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
