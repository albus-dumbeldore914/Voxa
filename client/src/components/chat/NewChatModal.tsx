import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import type { User } from '../../types';
import { Avatar } from '../common/Avatar';
import { Search, X, MessageSquarePlus, UserPlus, Loader2 } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onSelectUser }) => {
  const { searchUsers } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const users = await searchUsers(query);
      setResults(users);
      setIsSearching(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-sky-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-300">

        {/* Header */}
        <div className="p-4 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">New Conversation</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Search users by name, phone or email</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-sky-50 dark:border-slate-800/80">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, phone or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 bg-sky-50 dark:bg-sky-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-sky-400 dark:text-sky-500" />
              </div>
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">Find someone to chat with</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start typing to search VOXA users</p>
            </div>
          ) : isSearching ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">No users found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                No one matches "<span className="font-medium">{query}</span>"
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                {results.length} user{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-sky-50 dark:hover:bg-slate-800 transition-all text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} avatar={u.avatar} isOnline={u.isOnline} size="md" />
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
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
                  <div className="p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
