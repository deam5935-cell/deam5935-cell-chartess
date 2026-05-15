import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Search, DollarSign, Wallet, Calendar, CreditCard, ChevronDown, CheckCircle2, Clock, Trash2, X, Pencil, FileText, Download, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { generateReceiptPDF, generateBlankAdmissionFormPDF } from '../lib/receipt';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { syncStudentBalance } from '../lib/finance';
import { useSettings } from '../context/SettingsContext';

const paymentSchema = z.object({
  studentId: z.string().optional(),
  prospectiveName: z.string().optional(),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  date: z.string(),
  method: z.enum(['cash', 'transfer', 'other']),
  status: z.enum(['paid', 'pending']),
  category: z.enum(['tuition', 'registration', 'enrollment', 'hostel', 'maintenance', 'graduation', 'admission_form', 'other']).default('tuition'),
  notes: z.string().optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export function Payments() {
  const { isAdmin, user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { 
      date: format(new Date(), 'yyyy-MM-dd'), 
      method: 'transfer', 
      status: 'paid',
      category: 'tuition'
    }
  });

  useEffect(() => {
    // Real-time students for dropdown and balance
    const studentsUnsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    });

    // Real-time payments - query without orderBy to avoid index requirements in dev
    const q = query(collection(db, 'payments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const paymentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort locally by date desc - robust version
      paymentsList.sort((a: any, b: any) => {
        const getTs = (d: any) => {
          if (!d) return 0;
          if (typeof d.toDate === 'function') return d.toDate().getTime();
          if (d instanceof Date) return d.getTime();
          if (typeof d === 'string') return new Date(d).getTime();
          if (d.seconds) return d.seconds * 1000;
          return 0;
        };
        return getTs(b.date) - getTs(a.date);
      });
      setPayments(paymentsList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payments');
    });
    return () => {
      studentsUnsubscribe();
      unsubscribe();
    };
  }, []);


  const onSubmit = async (data: PaymentFormValues) => {
    if (!data.studentId && !data.prospectiveName) {
      return toast.error('Either select a student or provide a name for prospective student');
    }
    
    try {
      const payload = {
        ...data,
        date: new Date(data.date),
        recordedBy: user?.uid,
        updatedAt: serverTimestamp()
      };

      if (isEditMode && editingPaymentId) {
        await updateDoc(doc(db, 'payments', editingPaymentId), payload);
        if (data.studentId) await syncStudentBalance(data.studentId);
        toast.success('Payment record updated');
      } else {
        const docRef = await addDoc(collection(db, 'payments'), {
          ...payload,
          createdAt: serverTimestamp()
        });

        let balance;
        if (data.studentId) {
          const syncResult = await syncStudentBalance(data.studentId);
          balance = syncResult?.balance;
        }

        toast.success('Payment recorded successfully', {
          action: data.status === 'paid' ? {
            label: data.category === 'admission_form' ? 'Print Form & Receipt' : 'Print Receipt',
            onClick: () => {
              handleDownloadReceipt({ ...payload, id: docRef.id }, balance);
              if (data.category === 'admission_form') generateBlankAdmissionFormPDF(settings.logoUrl);
            }
          } : undefined
        });
      }
      
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingPaymentId(null);
      reset();
    } catch (error: any) {
      handleFirestoreError(error, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'payments');
    }
  };

  const handleEdit = (payment: any) => {
    setIsEditMode(true);
    setEditingPaymentId(payment.id);
    setIsModalOpen(true);
    
    // Fill form
    setValue('studentId', payment.studentId || '');
    setValue('prospectiveName', payment.prospectiveName || '');
    setValue('amount', payment.amount);
    setValue('date', payment.date?.toDate ? format(payment.date.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setValue('method', payment.method);
    setValue('status', payment.status);
    setValue('category', payment.category || 'tuition');
    setValue('notes', payment.notes || '');
  };

  const handleDelete = async (id: string, sId?: string) => {
    if (!isAdmin) return toast.error('Only admins can delete records');
    if (!window.confirm('Delete this payment record? This will automatically recalculate the student balance.')) return;
    try {
      await deleteDoc(doc(db, 'payments', id));
      if (sId) await syncStudentBalance(sId);
      toast.success('Payment deleted and balance updated');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${id}`);
    }
  };

  const handleDownloadReceipt = async (payment: any, overrideBalance?: number) => {
    let studentName = payment.prospectiveName;
    let studentCourse = 'Prospective Student';
    let tuitionTotal = 0;
    let studentTotalPaid = payment.amount;

    if (payment.studentId) {
      const student = students.find(s => s.id === payment.studentId);
      if (student) {
        studentName = student.fullName;
        studentCourse = student.course || 'Fashion Design';
        tuitionTotal = Number(student.tuitionTotal) || 0;
        
        // Robust calculation of total paid so far for this student (Tuition Ledger Only)
        studentTotalPaid = payments
          .filter(p => p.studentId === payment.studentId && p.status === 'paid' && (!p.category || p.category === 'tuition' || p.category === 'enrollment' || p.category === 'other'))
          .reduce((sum, p) => sum + (p.amount || 0), 0);
      }
    }

    if (!studentName) return toast.error('Payer name not found');

    const toastId = toast.loading('Generating receipt...');
    try {
      let paymentDate: Date;
      if (payment.date instanceof Date) {
        paymentDate = payment.date;
      } else if (payment.date?.toDate) {
        paymentDate = payment.date.toDate();
      } else {
        paymentDate = new Date();
      }

      await generateReceiptPDF({
        receiptNo: payment.id.substring(0, 8).toUpperCase(),
        studentName: studentName,
        studentCourse: studentCourse,
        amount: payment.amount,
        category: payment.category,
        balance: overrideBalance !== undefined ? overrideBalance : (tuitionTotal ? Math.max(0, tuitionTotal - studentTotalPaid) : 0),
        tuitionTotal: tuitionTotal,
        totalPaid: studentTotalPaid,
        date: paymentDate,
        method: payment.method,
        notes: payment.notes,
        recordedBy: user?.displayName || (isAdmin ? 'Administrator' : 'Staff'),
        logoUrl: settings.logoUrl
      });
      toast.success('Receipt generated successfully', { id: toastId });
    } catch (error) {
      console.error('Receipt generation failed:', error);
      toast.error('Failed to generate receipt', { id: toastId });
    }
  };

  const getPayerName = (p: any) => {
    if (p.studentId) {
      return students.find(s => s.id === p.studentId)?.fullName || 'Unknown Student';
    }
    return p.prospectiveName || 'Guest';
  };

  const filteredPayments = payments.filter(p => 
    getPayerName(p).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Payments</h2>
          <p className="text-gray-400">Track and manage student financial records.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={18} />
          <span>Record Payment</span>
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              setSearchParams(prev => {
                if (val) prev.set('search', val);
                else prev.delete('search');
                return prev;
              });
            }}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="geometric-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th className="text-center">Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-text-gray italic">Processing ledger...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-text-gray italic">No payments found.</td></tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="group">
                    <td>
                      <div className="flex flex-col">
                        {payment.studentId ? (
                          <button 
                            onClick={() => navigate(`/students?id=${payment.studentId}`)}
                            className="text-left font-bold hover:text-primary transition-colors cursor-pointer"
                          >
                            {getPayerName(payment)}
                          </button>
                        ) : (
                          <span className="font-bold text-amber-400">{getPayerName(payment)} (Prospective)</span>
                        )}
                        <p className="text-[10px] text-primary/70 font-mono tracking-tight uppercase">
                          ID: {payment.studentId ? payment.studentId.substring(0, 8) : 'GUEST-SALE'}
                        </p>
                      </div>
                      <p className="text-[10px] text-text-gray mt-1">{payment.notes || 'No notes'}</p>
                    </td>
                    <td>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-widest",
                        ['maintenance', 'hostel', 'graduation', 'admission_form', 'registration'].includes(payment.category)
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                          : "bg-primary/10 text-primary border-primary/20"
                      )}>
                        {payment.category?.replace('_', ' ') || 'tuition'}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-white">
                      GH₵ {payment.amount?.toLocaleString()}
                    </td>
                    <td>
                      <span className="flex items-center gap-2 text-xs text-text-gray capitalize">
                         <Wallet size={12} className="text-primary/70" />
                         {payment.method}
                      </span>
                    </td>
                    <td className="text-xs italic text-text-gray">
                      {payment.date?.toDate ? format(payment.date.toDate(), 'PPP') : 'Invalid Date'}
                    </td>
                    <td className="text-center">
                       <div className="flex justify-center">
                        <span className={cn(
                          "status-tag",
                          payment.status === 'paid' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                        )}>
                          {payment.status === 'paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {payment.status}
                        </span>
                       </div>
                    </td>
                    <td className="text-right">
                       <div className="flex justify-end gap-2">
                         {payment.status === 'paid' && (
                           <>
                             <button 
                               onClick={() => handleDownloadReceipt(payment)} 
                               className="px-3 py-1.5 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest border border-emerald-500/20"
                               title="Print Receipt"
                             >
                                <Printer size={14} />
                                Receipt
                             </button>
                             {payment.category === 'admission_form' && (
                               <button 
                                 onClick={() => generateBlankAdmissionFormPDF(settings.logoUrl)} 
                                 className="px-3 py-1.5 flex items-center gap-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest border border-blue-500/20"
                                 title="Print Blank Form"
                               >
                                  <FileText size={14} />
                                  Form
                               </button>
                             )}
                           </>
                         )}
                         <button onClick={() => handleEdit(payment)} className="p-2 text-primary/70 hover:text-primary rounded-md transition-all">
                            <Pencil size={16} />
                         </button>
                         {isAdmin && (
                            <button onClick={() => handleDelete(payment.id, payment.studentId)} className="p-2 text-rose-400/70 hover:text-rose-400 rounded-md transition-all">
                              <Trash2 size={16} />
                            </button>
                         )}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-lg">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-2">
                <DollarSign size={20} className="text-primary" />
                {isEditMode ? 'Edit Payment Entry' : 'Record Payment'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setIsEditMode(false); setEditingPaymentId(null); reset(); }} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Student (Existing)</label>
                  <div className="relative">
                    <select {...register('studentId')} className="input-field appearance-none bg-bg-dark pr-10">
                      <option value="">Select a student...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.fullName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Full Name (Prospective)</label>
                  <input {...register('prospectiveName')} className="input-field" placeholder="If not yet enrolled student" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Category</label>
                  <select {...register('category')} className="input-field bg-bg-dark">
                    <option value="tuition">Tuition Fee</option>
                    <option value="admission_form">Admission Form Sale</option>
                    <option value="registration">Registration Fee</option>
                    <option value="enrollment">Enrollment/Admission</option>
                    <option value="hostel">Hostel Fee (Recurring)</option>
                    <option value="maintenance">Maintenance (Recurring)</option>
                    <option value="graduation">Graduation Fee</option>
                    <option value="other">Other Fees</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Amount (GH₵)</label>
                  <input type="number" {...register('amount')} className="input-field font-bold text-primary" placeholder="0.00" />
                  {errors.amount && <p className="text-rose-500 text-[10px] uppercase font-bold">{errors.amount.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</label>
                   <select {...register('status')} className="input-field bg-bg-dark">
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Method</label>
                   <select {...register('method')} className="input-field bg-bg-dark">
                      <option value="transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                   </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Date</label>
                <input type="date" {...register('date')} className="input-field" />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Notes (Optional)</label>
                 <textarea {...register('notes')} className="input-field h-20 resize-none" placeholder="Partial payment for Semester 2..."></textarea>
              </div>

              <div className="pt-2 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-lg border border-white/10">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 px-8">
                  {isEditMode ? 'Update Ledger' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
