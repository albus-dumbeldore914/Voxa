import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { X, LogOut, Phone, Mail, Check, Edit2, Sun, Moon, Laptop } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, logout, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  // Auto-open edit mode if name is still the default placeholder
  const isDefaultName = !user?.name || user.name === 'VOXA User';
  const [isEditing, setIsEditing] = useState(isDefaultName);
  const [name, setName] = useState(user?.name === 'VOXA User' ? '' : (user?.name || ''));
  const [bio, setBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    await updateProfile({ name: name.trim(), bio: bio.trim() });
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-sky-100 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transition-colors duration-300">
        {/* Header */}
        <div className="p-4 border-b border-sky-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Your VOXA Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Content */}
        <div className="p-6 flex flex-col items-center text-center space-y-4 max-h-[80vh] overflow-y-auto">
          <Avatar name={user.name} avatar={user.avatar} size="xl" isOnline={true} />

          {isEditing ? (
            <div className="w-full space-y-3 text-left">
              {isDefaultName && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-medium">
                  👋 Set your real name so your friends can find and recognize you!
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name (e.g. Sanjyot Patil)"
                  autoFocus
                  className="w-full mt-1 p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Bio / Status</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What's your vibe?"
                  className="w-full mt-1 p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="w-full py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-colors"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{user.name}</h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                  title="Edit Name & Bio"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">{user.bio || 'Available on VOXA'}</p>
            </div>
          )}

          {/* Connected Credentials Box */}
          <div className="w-full bg-sky-50/70 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 rounded-2xl p-4 text-left space-y-2.5">
            <div className="text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider mb-1">
              Connected Credentials
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <Phone className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-medium">{user.phone}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-medium truncate">{user.email}</span>
            </div>
          </div>

          {/* Theme Switcher Box */}
          <div className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3 text-left">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              App Appearance
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-900 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1 transition-all ${
                  theme === 'system'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Device</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1 transition-all ${
                  theme === 'light'
                    ? 'bg-white text-sky-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-1.5 px-2 rounded-lg font-medium flex items-center justify-center gap-1 transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <LogOut className="w-4 h-4" /> Log Out of VOXA
          </button>
        </div>
      </div>
    </div>
  );
};
