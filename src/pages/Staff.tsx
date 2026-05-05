import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Trash2, Shield, User, Mail, X, Loader2, UserPlus, ShieldAlert, DollarSign, Calendar, Landmark, ReceiptText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const staffSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'staff']),
  specificRole: z.string().min(1, 'Specific assigned role is required'),
  salary: z.coerce.number().min(0).optional(),
  userId: z.string().optional()
});

type StaffFormValues = z.infer<typeof staffSchema>;

export function Staff() {
  const { user: currentUser, isAdmin } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema) as any,
    defaultValues: { role: 'staff' }
  });

  const salaryForm = useForm({
    defaultValues: {
      staffId: '',
      staffName: '',
      amount: 0,
      month: format(new Date(), 'MMMM'),
      year: new Date().getFullYear().toString(),
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    }
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('role', 'asc'));
    const unsubscribeStaff = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const sq = query(collection(db, 'salaries'), orderBy('createdAt', 'desc'));
    const unsubscribeSalaries = onSnapshot(sq, (snapshot) => {
      setSalaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'salaries');
    });

    return () => {
      unsubscribeStaff();
      unsubscribeSalaries();
    };
  }, []);

  const onSalarySubmit = async (data: any) => {
    try {
      const staffMember = staff.find(s => s.id === data.staffId);
      if (!staffMember) return toast.error('Invalid staff member');

      const salaryRef = doc(collection(db, 'salaries'));
      await setDoc(salaryRef, {
        ...data,
        staffName: staffMember.name,
        amount: Number(data.amount),
        createdAt: serverTimestamp()
      });

      toast.success('Salary payment recorded successfully');
      setIsSalaryModalOpen(false);
      salaryForm.reset();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'salaries');
    }
  };

  const deleteSalaryRecord = async (id: string) => {
    if (!window.confirm('Delete this salary payment record?')) return;
    try {
      await deleteDoc(doc(db, 'salaries', id));
      toast.success('Record removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `salaries/${id}`);
    }
  };
  const onSubmit = async (data: StaffFormValues) => {
    try {
      // For a real production app, you'd use a Cloud Function to create the Auth user.
      // Here we just add to Firestore. Admin must create Auth account manually in console.
      toast.info('Note: Staff must also be created in Firebase Auth Console to log in.');
      
      // We use email as the temporary document ID if we don't have a UID yet, 
      // but usually we want UID. For this demo, let's use email as ID if it's a new entry 
      // without an existing UID.
      const staffRef = doc(collection(db, 'users'));
      await setDoc(staffRef, {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        specificRole: data.specificRole,
        salary: data.salary,
        createdAt: serverTimestamp()
      });

      toast.success('Staff data added to record.');
      setIsModalOpen(false);
      reset();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (email === currentUser?.email) return toast.error('You cannot delete yourself.');
    if (!window.confirm('Remove this staff member from records?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success('Staff record removed.');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const toggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    try {
      await updateDoc(doc(db, 'users', id), { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
       <ShieldAlert size={64} className="text-rose-500 mb-4" />
       <h2 className="text-2xl font-bold">Access Denied</h2>
       <p className="text-gray-500">This page is reserved for administrators only.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-gray-400 mt-1">Control access roles and system administrators.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsSalaryModalOpen(true)} className="btn-primary bg-amber-500 hover:bg-amber-600">
            <DollarSign size={18} />
            <span>Process Payroll</span>
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <UserPlus size={18} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
              <User size={16} className="text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Active Staff Members</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">
                    <th className="px-6 py-4">Name/Role</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={3} className="p-12 text-center text-gray-500 italic">Syncing staff directory...</td></tr>
                  ) : staff.length === 0 ? (
                    <tr><td colSpan={3} className="p-12 text-center text-gray-500 italic">No staff members found.</td></tr>
                  ) : (
                    staff.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all ring-1 ring-primary/20">
                               {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                               <p className="font-black text-sm uppercase tracking-tight">{member.name}</p>
                               <p className="text-[10px] font-bold text-primary uppercase">{member.specificRole || member.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          <p className="text-xs text-gray-400 font-mono italic">{member.email}</p>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                               "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1",
                               member.role === 'admin' ? "bg-primary/20 text-primary border border-primary/20" : "bg-white/5 text-gray-400 border border-white/5"
                            )}>
                              {member.role}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              GH₵ {member.salary || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toggleRole(member.id, member.role)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-all text-[8px] font-black uppercase tracking-widest border border-white/5"
                            >
                              Flip Access
                            </button>
                            <button 
                              onClick={() => handleDelete(member.id, member.email)}
                              className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark size={16} className="text-amber-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Payroll Records</h3>
              </div>
              <ReceiptText size={16} className="text-gray-600" />
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-3">
              {salaries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-30 grayscale italic">
                  <DollarSign size={48} className="mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No disbursements recorded</p>
                </div>
              ) : (
                salaries.map((s) => (
                  <div key={s.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3 group hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-tighter">{s.staffName || 'Unknown Staff'}</h4>
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{s.month} {s.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-500 tracking-tighter">GH₵ {s.amount.toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{s.date}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <p className="text-[9px] text-gray-400 font-medium line-clamp-1">{s.notes || '-'}</p>
                      <button 
                        onClick={() => deleteSalaryRecord(s.id)}
                        className="p-1.5 text-rose-500 hidden group-hover:block transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Salary Modal */}
      {isSalaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-amber-500/10">
              <h3 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-2 text-amber-500">
                <DollarSign size={20} />
                Disburse Salary
              </h3>
              <button onClick={() => setIsSalaryModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={salaryForm.handleSubmit(onSalarySubmit)} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Select Recipient</label>
                <select {...salaryForm.register('staffId')} className="input-field bg-bg-dark">
                  <option value="">Choose staff...</option>
                  {staff.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (GH₵ {m.salary || 0}/mo)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Payment Month</label>
                  <select {...salaryForm.register('month')} className="input-field bg-bg-dark">
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Amount (GH₵)</label>
                  <input type="number" {...salaryForm.register('amount')} className="input-field" placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Transaction Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input type="date" {...salaryForm.register('date')} className="input-field pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Transaction Memo</label>
                <textarea {...salaryForm.register('notes')} className="input-field h-20 resize-none pt-4" placeholder="Optional details..."></textarea>
              </div>

              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setIsSalaryModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-lg border border-white/10">
                  Dismiss
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 bg-amber-500 hover:bg-amber-600">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                Add Staff Member
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input {...register('name')} className="input-field pl-10" placeholder="Jane Doe" />
                </div>
                {errors.name && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input {...register('email')} className="input-field pl-10" placeholder="jane@charthess.com" />
                </div>
                {errors.email && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase">{errors.email.message}</p>}
              </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Assigned Role</label>
        <select {...register('specificRole')} className="input-field bg-bg-dark">
          <option value="">Select a role...</option>
          <option value="secretary">Secretary</option>
          <option value="Pattern Drafting">Pattern Drafting</option>
          <option value="Garment">Garment</option>
          <option value="Men’s Wear">Men’s Wear</option>
          <option value="Fashion Illustration">Fashion Illustration</option>
          <option value="Students supervisor">Students supervisor</option>
          <option value="Tailoring">Tailoring</option>
          <option value="Other">Other</option>
        </select>
        {errors.specificRole && <p className="text-rose-500 text-[10px] font-bold mt-1 uppercase">{errors.specificRole.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Access Level</label>
        <select {...register('role')} className="input-field bg-bg-dark">
          <option value="staff">Standard Staff</option>
          <option value="admin">System Administrator</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Monthly Salary (GH₵)</label>
        <input type="number" {...register('salary')} className="input-field" placeholder="0.00" />
      </div>

              <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/10 flex gap-3">
                 <ShieldAlert size={24} className="text-amber-500 shrink-0" />
                 <p className="text-[10px] text-amber-500 uppercase leading-relaxed font-bold">
                    Important: You must separately create this user in the Firebase Authentication console for them to be able to sign in.
                 </p>
              </div>

              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-lg border border-white/10">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3">
                  Record Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
