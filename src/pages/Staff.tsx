import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Trash2, Shield, User, Mail, X, Loader2, UserPlus, ShieldAlert } from 'lucide-react';
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
  userId: z.string().optional() // Firestore ID (should match Auth UID)
});

type StaffFormValues = z.infer<typeof staffSchema>;

export function Staff() {
  const { user: currentUser, isAdmin } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'staff' }
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('role', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, []);

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
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <UserPlus size={18} />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500 italic">Syncing staff directory...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500 italic">No staff members found.</td></tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                         {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{member.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono italic">
                      {member.email}
                    </td>
                    <td className="px-6 py-4">
                       <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5",
                          member.role === 'admin' ? "bg-primary/20 text-primary border border-primary/20" : "bg-white/5 text-gray-400 border border-white/5"
                       )}>
                         {member.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                         {member.role}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-xs italic text-gray-500">
                      {member.createdAt ? format(member.createdAt.toDate(), 'PP') : 'Pending'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleRole(member.id, member.role)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-all text-[10px] font-bold uppercase tracking-tighter"
                          title="Change Role"
                        >
                          Change Role
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
                <select {...register('role')} className="input-field bg-bg-dark">
                  <option value="staff">Standard Staff</option>
                  <option value="admin">System Administrator</option>
                </select>
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
