import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, CalendarCheck, BarChart3, UsersRound, LogOut, Sun, Moon } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { userRole, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Staff', path: '/staff', icon: UsersRound });
  }

  return (
    <aside className="w-[240px] bg-bg-black border-r border-border flex flex-col h-screen sticky top-0">
      <div className="pt-12 pb-8 px-6 flex flex-col gap-4">
        <div className="flex items-center justify-center">
          <img 
            src="/charthess_logo-1.png" 
            alt="Charthess Logo" 
            className="h-[85px] w-auto object-contain drop-shadow-[0_0_20px_rgba(28,163,184,0.5)]"
            referrerPolicy="no-referrer"
            loading="eager"
          />
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "sidebar-link",
              isActive && "active"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-border space-y-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-bg-black border border-border hover:border-primary/30 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-indigo-400" />
            )}
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)]">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>
          <div className="w-8 h-4 rounded-full bg-border relative transition-colors group-hover:bg-primary/20">
            <div className={cn(
              "absolute top-1 w-2 h-2 rounded-full transition-all duration-300",
              theme === 'dark' ? "right-1 bg-amber-400" : "left-1 bg-indigo-400"
            )} />
          </div>
        </button>

        <div className="px-4 py-4 bg-white/5 rounded-xl border border-white/5">
           <p className="text-[10px] font-black uppercase tracking-widest text-text-gray mb-1">Authenticated As</p>
           <p className="text-[11px] font-bold text-white truncate">{useAuth().user?.email}</p>
           <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                isAdmin ? "bg-primary/10 text-primary border-primary/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                {isAdmin ? 'ADMIN ACCOUNT' : (userRole || 'Pending...')}
              </span>
           </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer border border-transparent hover:border-red-500/20"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
