import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { WelcomeSplash } from './components/common/WelcomeSplash';

const queryClient = new QueryClient();

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, showWelcome, setShowWelcome } = useAuth();
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <>
      {showWelcome && user && (
        <WelcomeSplash
          userName={user.name}
          avatar={user.avatar}
          onComplete={() => setShowWelcome(false)}
        />
      )}

      <ChatProvider>
        <div className="h-screen w-screen flex bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none transition-colors duration-300">
          {/* Sidebar: Always visible on desktop, toggleable on mobile */}
          <div
            className={`h-full w-full md:w-80 lg:w-96 ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <Sidebar onSelectMobileChat={() => setMobileView('chat')} />
          </div>

          {/* Chat Area: Hidden on mobile when viewing sidebar */}
          <div
            className={`h-full flex-1 ${
              mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <ChatArea onBackToSidebar={() => setMobileView('sidebar')} />
          </div>
        </div>
      </ChatProvider>
    </>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
