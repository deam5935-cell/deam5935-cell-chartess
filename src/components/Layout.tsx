import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Toaster } from 'sonner';

export function Layout() {
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <div className="flex min-h-screen bg-bg-black text-[var(--text-main)] selection:bg-primary/30 transition-colors duration-300">
      <Toaster position="top-right" theme={theme} richColors />
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-x-hidden p-8">
        <header className="flex justify-end items-center mb-8">
          <div className="flex items-center gap-3 bg-card-dark px-4 py-1.5 rounded-full border border-border shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[13px] font-medium text-text-gray">{user?.email}</span>
          </div>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
