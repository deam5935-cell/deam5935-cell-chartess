import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { TrendingUp, DollarSign, Users, Award, AlertTriangle, FileDown, Calendar } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export function Analytics() {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDateRange, setExportDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      setPayments(snap.docs.map(doc => {
        const data = doc.data();
        const parseDate = (d: any) => {
          if (!d) return new Date();
          if (typeof d.toDate === 'function') return d.toDate();
          if (d instanceof Date) return d;
          if (typeof d === 'string') return new Date(d);
          if (d.seconds) return new Date(d.seconds * 1000);
          return new Date();
        };
        return { id: doc.id, ...data, date: parseDate(data.date) };
      }));
    });
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);
    return () => { unsubPayments(); unsubStudents(); };
  }, []);

  const stats = {
    totalRevenue: payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0),
    thisMonth: payments.filter(p => p.status === 'paid' && p.date >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((acc, p) => acc + p.amount, 0),
    thisWeek: payments.filter(p => p.status === 'paid' && isWithinInterval(p.date, { start: startOfWeek(new Date()), end: endOfWeek(new Date()) })).reduce((acc, p) => acc + p.amount, 0),
    outstanding: students.reduce((acc, s) => acc + (Number(s.balance) || 0), 0),
    avgPerStudent: students.length > 0 ? payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0) / students.length : 0
  };

  // Monthly Comparison
  const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
  const lastMonthRevenue = payments
    .filter(p => p.status === 'paid' && p.date >= lastMonthStart && p.date <= lastMonthEnd)
    .reduce((acc, p) => acc + p.amount, 0);
  
  const revenueGrowth = lastMonthRevenue > 0 
    ? ((stats.thisMonth - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 100;

  // Revenue Projection (Simple)
  const activeStudents = students.filter(s => s.status === 'active');
  const totalDueFromActive = activeStudents.reduce((acc, s) => {
    const paidByStudent = payments
      .filter(p => p.studentId === s.id && p.status === 'paid')
      .reduce((ta, tp) => ta + tp.amount, 0);
    return acc + Math.max(0, (s.tuitionTotal || 0) - paidByStudent);
  }, 0);

  const projectedRevenue = totalDueFromActive > 0 ? totalDueFromActive / 4 : stats.thisMonth; // Rough estimate

  // Chart Data: Revenue Over Time (Daily - Last 30 Days)
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    const day = subDays(new Date(), i);
    const dayTotal = payments
      .filter(p => p.status === 'paid' && format(p.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
      .reduce((acc, p) => acc + p.amount, 0);
    return { date: format(day, 'MMM dd'), total: dayTotal };
  }).reverse();

  // Chart Data: Monthly Breakdown
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = months.map((month, i) => {
    const monthTotal = payments
      .filter(p => p.status === 'paid' && p.date.getMonth() === i && p.date.getFullYear() === new Date().getFullYear())
      .reduce((acc, p) => acc + p.amount, 0);
    return { name: month, revenue: monthTotal };
  });

  // Chart Data: Payment Methods
  const methodData = [
    { name: 'Cash', value: payments.filter(p => p.method === 'cash').length },
    { name: 'Transfer', value: payments.filter(p => p.method === 'transfer').length },
    { name: 'Other', value: payments.filter(p => p.method === 'other').length },
  ];

  const COLORS = ['#1CA3B8', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#F43F5E', '#14B8A6'];

  // Chart Data: Revenue by Category
  const categoryData = [
    { name: 'Tuition', value: payments.filter(p => p.status === 'paid' && (!p.category || p.category === 'tuition')).reduce((acc, p) => acc + p.amount, 0) },
    { name: 'Enrollment', value: payments.filter(p => p.status === 'paid' && p.category === 'enrollment').reduce((acc, p) => acc + p.amount, 0) },
    { name: 'Admission Form', value: payments.filter(p => p.status === 'paid' && p.category === 'admission_form').reduce((acc, p) => acc + p.amount, 0) },
    { name: 'Registration', value: payments.filter(p => p.status === 'paid' && p.category === 'registration').reduce((acc, p) => acc + p.amount, 0) },
    { name: 'Hostel', value: payments.filter(p => p.status === 'paid' && p.category === 'hostel').reduce((acc, p) => acc + p.amount, 0) },
    { name: 'Maintenance', value: payments.filter(p => p.status === 'paid' && p.category === 'maintenance').reduce((acc, p) => acc + p.amount, 0) },
    { name: 'Graduation', value: payments.filter(p => p.status === 'paid' && p.category === 'graduation').reduce((acc, p) => acc + p.amount, 0) },
    { name: 'Other', value: payments.filter(p => p.status === 'paid' && p.category === 'other').reduce((acc, p) => acc + p.amount, 0) },
  ].filter(c => c.value > 0);

  const outstandingList = payments
    .filter(p => p.status === 'pending')
    .map(p => {
      const student = students.find(s => s.id === p.studentId);
      return { ...p, studentName: student?.fullName || 'Unknown' };
    });

  const exportReport = () => {
    const startDate = new Date(exportDateRange.start);
    const endDate = new Date(exportDateRange.end);
    endDate.setHours(23, 59, 59);

    const filteredPayments = payments.filter(p => p.date >= startDate && p.date <= endDate);

    const csvRows = [
      ['Date', 'Student', 'Amount GH₵', 'Status', 'Method', 'Notes'],
      ...filteredPayments.map(p => [
        format(p.date, 'yyyy-MM-dd'),
        students.find(s => s.id === p.studentId)?.fullName || 'Unknown',
        p.amount,
        p.status,
        p.method,
        p.notes || ''
      ])
    ];

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payment_report_${exportDateRange.start}_to_${exportDateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported for selected range');
  };

  const exportFinancialSummary = () => {
    const csvRows = [
      ['Student', 'Tuition GH₵', 'Goal Paid GH₵', 'Outstanding GH₵', 'Last Payment Date'],
      ...students.map(s => {
         const sPayments = payments.filter(p => p.studentId === s.id && p.status === 'paid');
         const paid = sPayments.reduce((a,c) => a + (c.amount || 0), 0);
         const lastP = sPayments.length > 0 ? sPayments.sort((a,b) => b.date - a.date)[0] : null;
         return [
           s.fullName,
           s.tuitionTotal || 0,
           paid,
           Math.max(0, (s.tuitionTotal || 0) - paid),
           lastP ? format(lastP.date, 'yyyy-MM-dd') : 'None'
         ];
      })
    ];

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `student_financial_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Financial summary exported');
  };

  if (loading) return <div>Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
         <AlertTriangle size={64} className="text-amber-500 mb-4" animate-bounce />
         <h2 className="text-2xl font-bold uppercase tracking-tighter">Access Restricted</h2>
         <p className="text-gray-500 max-w-md mx-auto">This financial analytics dashboard is reserved for administrative accounts only. Please contact a system administrator if you believe this is an error.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Analytics</h2>
          <p className="text-gray-400 mt-1">Deep insights into school revenue and payment trends.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3 bg-card-dark p-2 rounded-xl border border-border">
            <div className="flex items-center gap-2 px-3 border-r border-border">
              <Calendar size={14} className="text-text-gray" />
              <input 
                type="date" 
                value={exportDateRange.start}
                onChange={(e) => setExportDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent text-xs font-bold focus:outline-none"
              />
              <span className="text-text-gray">to</span>
              <input 
                type="date" 
                value={exportDateRange.end}
                onChange={(e) => setExportDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent text-xs font-bold focus:outline-none"
              />
            </div>
            <button 
              onClick={exportReport}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors"
            >
              Export Transactions
            </button>
          </div>
          <button 
             onClick={exportFinancialSummary}
             className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 border border-white/10 text-sm font-bold uppercase tracking-widest"
          >
            <FileDown size={18} />
            <span>Export Financial Summary</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Revenue', value: stats.totalRevenue, icon: DollarSign, color: 'text-emerald-400' },
          { label: 'This Month', value: stats.thisMonth, icon: TrendingUp, color: 'text-primary' },
          { label: 'This Week', value: stats.thisWeek, icon: Award, color: 'text-amber-400' },
          { label: 'Outstanding', value: stats.outstanding, icon: AlertTriangle, color: 'text-rose-400', urgent: true },
          { label: 'Avg / Student', value: stats.avgPerStudent, icon: Users, color: 'text-blue-400' },
        ].map((card) => (
          <div key={card.label} className="glass-card p-6 relative">
            <span className="text-[12px] font-semibold text-text-gray uppercase tracking-[0.05em] mb-2 block">{card.label}</span>
            <div className={cn("text-2xl font-bold", card.urgent && "text-rose-400")}>
              GH₵ {card.value.toLocaleString()}
            </div>
            {card.label === 'Outstanding' && (
              <span className="text-[12px] text-rose-400/70 mt-1 block font-medium">
                {outstandingList.length} Students
              </span>
            )}
            {card.label === 'This Month' && (
              <span className={cn("text-[10px] font-bold mt-1 block uppercase tracking-wider", revenueGrowth >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% vs Last Month
              </span>
            )}
          </div>
        ))}
        
        {/* Revenue Projection Card */}
        <div className="glass-card p-6 border-primary/20 bg-primary/5">
           <span className="text-[12px] font-semibold text-primary uppercase tracking-[0.05em] mb-2 block">Revenue Projection</span>
           <div className="text-2xl font-black text-white">
              GH₵ {projectedRevenue.toLocaleString()}
           </div>
           <span className="text-[10px] text-text-gray mt-1 block font-bold uppercase tracking-widest">Est. next month income</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ... existing charts ... */}
        {/* Using placeholders to represent the visual structure while keeping functionality */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider">Revenue Trend (30d)</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last30Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₵${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121826', borderRadius: '12px', border: '1px solid #1E293B', fontSize: '12px' }}
                  itemStyle={{ color: '#1CA3B8' }}
                />
                <Line type="monotone" dataKey="total" stroke="#1CA3B8" strokeWidth={3} dot={false} animationDuration={2000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider">Monthly Breakdown</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#121826', borderRadius: '12px', border: '1px solid #1E293B', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#1CA3B8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-primary">Revenue by Category (Auxiliary tracking)</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#121826', borderRadius: '12px', border: '1px solid #1E293B', fontSize: '12px' }}
                   formatter={(value: number) => `GH₵ ${value.toLocaleString()}`}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
             {categoryData.map((cat, idx) => (
                <div key={idx} className="flex flex-col">
                   <span className="text-[10px] text-text-gray font-bold uppercase">{cat.name}</span>
                   <span className="text-sm font-black">GH₵ {cat.value.toLocaleString()}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-6">Payment Methods</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#121826', borderRadius: '12px', border: '1px solid #1E293B', fontSize: '12px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outstanding Tracker */}
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider">⚠️ Top Debtors Tracking</h3>
            <span className="text-[12px] text-text-gray cursor-pointer border-b border-dashed border-text-gray">Sort by Balance</span>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="geometric-table">
                <thead>
                   <tr>
                      <th>Student Name</th>
                      <th>Total Expectation</th>
                      <th>Balance Owed</th>
                      <th>Status</th>
                   </tr>
                </thead>
                <tbody>
                   {students.filter(s => {
                     const paid = payments.filter(p => p.studentId === s.id && p.status === 'paid').reduce((a, c) => a + c.amount, 0);
                     return (s.tuitionTotal || 0) - paid > 0;
                   }).sort((a,b) => {
                     const paidA = payments.filter(p => p.studentId === a.id && p.status === 'paid').reduce((acc, c) => acc + c.amount, 0);
                     const paidB = payments.filter(p => p.studentId === b.id && p.status === 'paid').reduce((acc, c) => acc + c.amount, 0);
                     return ((b.tuitionTotal || 0) - paidB) - ((a.tuitionTotal || 0) - paidA);
                   }).slice(0, 10).map((s, idx) => {
                     const paid = payments.filter(p => p.studentId === s.id && p.status === 'paid').reduce((a, c) => a + c.amount, 0);
                     const bal = (s.tuitionTotal || 0) - paid;
                     return (
                      <tr key={idx}>
                         <td className="font-semibold">{s.fullName}</td>
                         <td className="text-text-gray">GH₵ {s.tuitionTotal?.toLocaleString() || 0}</td>
                         <td className="text-rose-400 font-bold">GH₵ {bal.toLocaleString()}</td>
                         <td>
                            <span className={cn("status-tag", bal > (s.tuitionTotal * 0.5) ? "bg-rose-400/10 text-rose-400" : "bg-amber-400/10 text-amber-500")}>
                              {bal > (s.tuitionTotal * 0.5) ? 'Critical' : 'Partial'}
                            </span>
                         </td>
                      </tr>
                    );
                   })}
                </tbody>
             </table>
          </div>
        </div>

        {/* Most Consistent Payers */}
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider">🌟 Most Consistent Payers</h3>
            <span className="text-[12px] text-text-gray">Lifetime successful payments</span>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="geometric-table">
                <thead>
                   <tr>
                      <th>Student</th>
                      <th>Payment Count</th>
                      <th>Last Paid</th>
                   </tr>
                </thead>
                <tbody>
                   {students.map(s => {
                     const sPayments = payments.filter(p => p.studentId === s.id && p.status === 'paid');
                     return { 
                       ...s, 
                       paymentCount: sPayments.length,
                       lastDate: sPayments.length > 0 ? sPayments.sort((a,b) => b.date - a.date)[0].date : null
                     };
                   }).filter(s => s.paymentCount > 0).sort((a,b) => b.paymentCount - a.paymentCount).slice(0, 10).map((s, idx) => (
                      <tr key={idx}>
                         <td className="font-semibold">{s.fullName}</td>
                         <td>
                            <div className="flex items-center gap-2">
                               <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, (s.paymentCount / 5) * 100)}%` }}></div>
                               </div>
                               <span className="font-bold text-emerald-400">{s.paymentCount}</span>
                            </div>
                         </td>
                         <td className="text-text-gray text-xs italic">
                            {s.lastDate ? format(s.lastDate, 'MMM dd, yyyy') : 'No record'}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}
