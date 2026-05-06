import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Users, CreditCard, DollarSign, Activity, Plus, TrendingUp, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { isAdmin, userRole } = useAuth();
  const isStaffValue = isAdmin || userRole === 'staff';

  const [stats, setStats] = useState({
    totalStudents: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    outstandingPayments: 0,
    activeStudents: 0
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsMap, setStudentsMap] = useState<Record<string, {name: string, photoUrl?: string}>>({});
  const [topDebtors, setTopDebtors] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    let students: any[] = [];
    let payments: any[] = [];

    const updateDashboard = () => {
      const now = new Date();
      const startOfMo = new Date(now.getFullYear(), now.getMonth(), 1);

      // Student Stats
      const activeCount = students.filter(s => s.status === 'active').length;
      
      // Payment Stats
      const monthlyRev = payments
        .filter(p => p.status === 'paid' && p.date.toDate() >= startOfMo)
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
      const totalRev = payments
        .filter(p => p.status === 'paid')
        .reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
      const outstanding = students.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);

      setStats({
        totalStudents: students.length,
        activeStudents: activeCount,
        monthlyRevenue: monthlyRev,
        totalRevenue: totalRev,
        outstandingPayments: outstanding
      });

      // Name & Photo Map
      const sMap: Record<string, {name: string, photoUrl?: string}> = {};
      students.forEach(s => sMap[s.id] = { name: s.fullName, photoUrl: s.photoUrl });
      setStudentsMap(sMap);

      // Recent Activity
      const activities: any[] = [];
      students.forEach(s => {
        if (s.createdAt) {
          activities.push({ type: 'student', date: s.createdAt.toDate(), msg: `New student enrolled: ${s.fullName}` });
        }
      });
      payments.forEach(p => {
        activities.push({ type: 'payment', date: p.date.toDate(), msg: `Payment of GH₵${p.amount} recorded for ${sMap[p.studentId]?.name || 'Unknown Student'}` });
      });
      setRecentActivity(activities.sort((a,b) => b.date - a.date).slice(0, 8));

      // Top Debtors
      const debtors = students.map(s => {
        const paid = payments.filter(p => p.studentId === s.id && p.status === 'paid').reduce((a, c) => a + (c.amount || 0), 0);
        return { ...s, balance: Math.max(0, (s.tuitionTotal || 0) - paid) };
      }).filter(s => s.balance > 0).sort((a,b) => b.balance - a.balance).slice(0, 5);
      setTopDebtors(debtors);

      // Recent Payments (top 5)
      setRecentPayments(payments.slice(0, 5));
      setLoading(false);
    };

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateDashboard();
    }, (error) => handleFirestoreError(error, OperationType.GET, 'students'));

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('date', 'desc')), (snap) => {
      payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateDashboard();
    }, (error) => handleFirestoreError(error, OperationType.GET, 'payments'));

    return () => { unsubStudents(); unsubPayments(); };
  }, []);

  const statCards = [
    { name: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', adminOnly: false },
    { name: 'Active Students', value: stats.activeStudents, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10', adminOnly: false },
    { name: 'Revenue (Month)', value: `GH₵ ${stats.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', adminOnly: true },
    { name: 'Total Revenue', value: `GH₵ ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', adminOnly: true },
  ];

  const filteredStatCards = statCards.filter(card => !card.adminOnly || isAdmin);

  if (loading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!isStaffValue && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
           <p className="text-amber-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
             <ShieldAlert size={16} />
             System Notice: Read-Only Mode. Please register as staff to manage data.
           </p>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
           <div className="leading-tight border-l-4 border-primary pl-4 py-1">
             <h2 className="text-3xl font-black tracking-tight uppercase text-white">Charthess</h2>
             <p className="text-primary font-bold uppercase tracking-[0.4em] text-[10px]">School of Fashion</p>
           </div>
        </div>
        <div className="flex gap-4">
          <Link to="/students" className="btn-primary">
            <Plus size={18} />
            <span>Add Student</span>
          </Link>
          <Link to="/payments" className="bg-[var(--border-main)] hover:bg-primary/5 text-[var(--text-main)] px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 border border-border">
            <CreditCard size={18} />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStatCards.map((stat) => (
          <div key={stat.name} className="glass-card p-6 flex flex-col gap-4">
            <div className={cn("p-3 rounded-xl w-fit", stat.bg)}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-gray uppercase tracking-widest">{stat.name}</p>
              <h3 className="text-2xl font-bold mt-1 text-[var(--text-main)]">{stat.value}</h3>
            </div>
          </div>
        ))}
        {!isAdmin && (
          <div className="lg:col-span-2 glass-card p-6 flex items-center justify-center border-dashed border-border opacity-60">
             <div className="flex flex-col items-center gap-2">
                <ShieldAlert size={24} className="text-text-gray" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-gray">Financial Metrics Hidden (Admin Only)</p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Payments */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 text-[var(--text-main)]">
              <CreditCard size={18} className="text-primary" />
              Recent Payments
            </h3>
            <Link to="/payments" className="text-sm text-primary hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="geometric-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-text-gray italic">No recent payments recorded.</td>
                  </tr>
                ) : (
                  recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden surface-low shrink-0">
                          {studentsMap[payment.studentId]?.photoUrl ? (
                            <img src={studentsMap[payment.studentId]?.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-xs">
                              {studentsMap[payment.studentId]?.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-[var(--text-main)]">{studentsMap[payment.studentId]?.name || 'Unknown Student'}</span>
                      </td>
                      <td className="font-mono text-[var(--text-main)]">GH₵ {payment.amount.toLocaleString()}</td>
                      <td className="text-text-gray italic">
                        {format(payment.date.toDate(), 'MMM dd, yyyy')}
                      </td>
                      <td>
                        <span className={cn(
                          "status-tag",
                          payment.status === 'paid' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold flex items-center gap-2 border-b border-border pb-4 uppercase tracking-widest text-[11px] text-text-gray">
             <Activity size={18} className="text-primary" />
             Recent System Activity
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 opacity-50"></div>
                <div>
                  <p className="text-[var(--text-main)] leading-relaxed">{activity.msg}</p>
                  <p className="text-[10px] text-text-gray mt-1">{format(activity.date, 'MMM dd, HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Outstanding Fees Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-rose-500/5">
            <h3 className="font-bold flex items-center gap-2 text-rose-400">
              <DollarSign size={18} />
              Students With Outstanding Fees
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-gray">Top 5 Debtors</span>
          </div>
          <div className="p-0">
            <table className="geometric-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Course</th>
                  <th className="text-right">Balance Owed</th>
                </tr>
              </thead>
              <tbody>
                {topDebtors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-text-gray italic p-8">No outstanding fees found. Great job!</td>
                  </tr>
                ) : (
                  topDebtors.map((debtor) => (
                    <tr key={debtor.id}>
                      <td className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden surface-low shrink-0">
                          {debtor.photoUrl ? (
                            <img src={debtor.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-xs">
                              {debtor.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-[var(--text-main)]">{debtor.fullName}</span>
                      </td>
                      <td className="text-text-gray text-xs">{debtor.course}</td>
                      <td className="text-right font-black text-rose-400">
                        GH₵ {debtor.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Placeholder for future growth or summary */}
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4 border-dashed opacity-50">
           <TrendingUp size={48} className="text-primary/20" />
           <div>
             <p className="text-sm font-bold uppercase tracking-widest text-text-gray">Growth Analytics</p>
             <p className="text-xs text-text-gray/70 mt-1">Detailed revenue projections and course performance metrics coming soon.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
