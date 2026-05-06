import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, CalendarCheck, BarChart3, UsersRound, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { userRole } = useAuth();
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

  if (userRole === 'admin') {
    navItems.push({ name: 'Staff', path: '/staff', icon: UsersRound });
  }

  return (
    <aside className="w-[240px] bg-bg-black border-r border-border flex flex-col h-screen sticky top-0">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/logo1.png" 
            alt="Charthess Logo" 
            className="h-[45px] w-auto object-contain drop-shadow-[0_0_10px_rgba(28,163,184,0.3)]"
            referrerPolicy="no-referrer"
            loading="eager"
          />
          <div className="leading-tight">
            <h1 className="text-[18px] font-black uppercase tracking-tighter text-white">Charthess</h1>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary">School of Fashion</p>
          </div>
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

      <div className="p-4 mt-auto border-t border-border-dark space-y-4">
        <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
           <p className="text-[10px] font-black uppercase tracking-widest text-text-gray mb-1">Authenticated As</p>
           <p className="text-[11px] font-bold text-white truncate">{useAuth().user?.email}</p>
           <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                userRole === 'admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}>
                {userRole || 'Pending...'}
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
