import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { Activity, Plus, Search, Filter, Edit2, Trash2, X, Phone, Mail, GraduationCap, Calendar, UserPlus, CreditCard, DollarSign, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const studentSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  photoUrl: z.string().optional(),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  course: z.string().min(2, 'Course is required'),
  specialization: z.string().optional(),
  tuitionTotal: z.coerce.number().min(0).default(0),
  enrollmentDate: z.string(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional()
});

type StudentFormValues = z.infer<typeof studentSchema>;

export function Students() {
  const { isAdmin, userRole } = useAuth();
  const isStaffValue = userRole === 'admin' || userRole === 'staff';
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  
  // For Enrollment Photo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(studentSchema),
    defaultValues: { status: 'active', enrollmentDate: format(new Date(), 'yyyy-MM-dd'), tuitionTotal: 0 }
  });

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('fullName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'students');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (viewingStudent) {
      const q = query(collection(db, 'payments'), where('studentId', '==', viewingStudent.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setStudentPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const portfolioQ = query(collection(db, 'portfolio'), where('studentId', '==', viewingStudent.id), orderBy('date', 'desc'));
      const unsubPortfolio = onSnapshot(portfolioQ, (snapshot) => {
        setPortfolioItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'portfolio'));

      return () => { unsubscribe(); unsubPortfolio(); };
    }
  }, [viewingStudent]);

  const totalPaid = studentPayments
    .filter(p => p.status === 'paid')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  
  const balance = (viewingStudent?.tuitionTotal || 0) - totalPaid;
  const lastPayment = studentPayments.length > 0 
    ? studentPayments.sort((a, b) => b.date.toDate() - a.date.toDate())[0]
    : null;

  const uploadFile = async (file: File, path: string) => {
    return new Promise<string>((resolve, reject) => {
      if (!storage) {
        reject(new Error('Firebase Storage is not initialized. Please check your configuration.'));
        return;
      }
      
      const fileRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      const timeout = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error('Upload timed out. This can happen if the image is too large or if Firebase Storage is not enabled/configured in your project.'));
      }, 60000); // 60 second timeout

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        }, 
        (error) => {
          clearTimeout(timeout);
          console.error('Firebase Storage Error:', error);
          
          let message = 'Upload failed. ';
          if (error.code === 'storage/unauthorized') {
            message += 'Please check your Storage Rules in Firebase Console.';
          } else if (error.code === 'storage/retry-limit-exceeded') {
            message += 'Network error or Storage bucket not found.';
          } else {
            message += error.message;
          }
          reject(new Error(message));
        }, 
        () => {
          clearTimeout(timeout);
          getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });
  };

  const onSubmit = async (data: StudentFormValues) => {
    setIsUploading(true);
    const toastId = toast.loading(editingStudent ? 'Updating student record...' : 'Enrolling new student...');
    try {
      let finalPhotoUrl = editingStudent?.photoUrl || '';
      
      if (selectedFile) {
        try {
          finalPhotoUrl = await uploadFile(selectedFile, 'students');
        } catch (uploadErr: any) {
          console.error('File upload failed:', uploadErr);
          toast.error('Photo upload failed. Please check your storage bucket configuration.');
          throw uploadErr;
        }
      }

      const payload = {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || '',
        course: data.course,
        specialization: data.specialization || '',
        tuitionTotal: data.tuitionTotal,
        enrollmentDate: data.enrollmentDate,
        status: data.status,
        notes: data.notes || '',
        photoUrl: finalPhotoUrl,
        updatedAt: serverTimestamp()
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), payload);
        toast.success('Student record updated', { id: toastId });
      } else {
        await addDoc(collection(db, 'students'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Student enrolled successfully', { id: toastId });
      }
      
      setSelectedFile(null);
      setPhotoPreview(null);
      closeModal();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save student data: ' + (error.message || 'Unknown error'), { id: toastId });
      // Only call handleFirestoreError specifically for permission errors if needed, 
      // but here we just want to log and stop the loading state.
    } finally {
      setIsUploading(false);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!viewingStudent || !file) return;

    // Validate
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Portfolio image too large. Max 8MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image.');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading design to portfolio...');
    try {
      console.log('Starting portfolio upload...');
      const url = await uploadFile(e.target.files[0], 'portfolio');
      console.log('File uploaded to storage, adding to firestore...');
      await addDoc(collection(db, 'portfolio'), {
        studentId: viewingStudent.id,
        imageUrl: url,
        date: serverTimestamp()
      });
      toast.success('Portfolio design added successfully', { id: toastId });
    } catch (error: any) {
      console.error('Portfolio upload error:', error);
      toast.error('Portfolio upload failed: ' + (error.message || 'Check storage rules'), { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const deletePortfolioItem = async (id: string) => {
    if (!window.confirm('Delete this design from portfolio?')) return;
    try {
      await deleteDoc(doc(db, 'portfolio', id));
      toast.success('Item removed');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `portfolio/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return toast.error('Only admins can delete students');
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
      toast.success('Student deleted');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
    }
  };

  const handleEnrollmentPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image is too large. Max size is 5MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file.');
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openModal = (student?: any) => {
    setSelectedFile(null);
    setPhotoPreview(null);
    if (student) {
      setEditingStudent(student);
      setPhotoPreview(student.photoUrl || null);
      reset(student);
    } else {
      setEditingStudent(null);
      reset({ status: 'active', enrollmentDate: format(new Date(), 'yyyy-MM-dd') });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeOnly) {
      return matchesSearch && s.status === 'active';
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!isStaffValue && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl animate-bounce-in">
          <p className="text-amber-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Activity size={16} />
            System Notice: Read-Only Mode. Your account is not verified as Staff. Image uploads and database changes will fail.
          </p>
        </div>
      )}
      <div className="flex justify-between items-center bg-gradient-to-r from-bg-black to-bg-dark p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase text-white">Student Directory</h2>
          <p className="text-text-gray mt-1 text-xs font-bold uppercase tracking-widest">Enrollment & Student Management</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary group">
          <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
          <span>New Student</span>
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search students by name, course, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button 
          onClick={() => {
            setActiveOnly(!activeOnly);
            toast.info(activeOnly ? 'Showing all students' : 'Filtering for active students only');
          }}
          className={cn(
            "p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
            activeOnly ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
          )}
        >
          <Filter size={18} />
          <span>{activeOnly ? 'Active' : 'All'}</span>
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="geometric-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Course</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Enrolled</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-text-gray italic">Finding fashionistas...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-text-gray italic">No students found.</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="group">
                    <td>
                      <div className="flex items-center gap-3 cursor-pointer group/name" onClick={() => setViewingStudent(student)}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-sm">
                              {student.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold group-hover:text-primary transition-colors">{student.fullName}</p>
                          <p className="text-[10px] text-primary/70 font-mono">ID: {student.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                        {student.course}
                      </span>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-text-gray text-xs">
                          <Phone size={12} />
                          <span>{student.phone}</span>
                        </div>
                        {student.email && (
                          <div className="flex items-center gap-2 text-text-gray text-xs">
                            <Mail size={12} />
                            <span>{student.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={cn(
                        "status-tag",
                        student.status === 'active' ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-text-gray"
                      )}>
                        {student.status}
                      </span>
                    </td>
                    <td className="text-xs italic text-text-gray">
                      {student.enrollmentDate}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingStudent(student)} className="p-2 text-text-gray hover:text-primary rounded-md transition-all">
                          <Activity size={16} />
                        </button>
                        <button onClick={() => openModal(student)} className="p-2 text-text-gray hover:text-white rounded-md transition-all">
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(student.id)} className="p-2 text-rose-400/70 hover:text-rose-400 rounded-md transition-all">
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

      {/* Student Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-border bg-black/20 flex justify-between items-start">
              <div className="flex gap-6">
                <div className="relative group">
                  {viewingStudent.photoUrl ? (
                    <img src={viewingStudent.photoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-primary/20" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl font-black text-primary">
                      {viewingStudent.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{viewingStudent.fullName}</h3>
                  <p className="text-primary font-bold uppercase tracking-widest text-xs mt-1">{viewingStudent.course} • {viewingStudent.specialization || 'General'}</p>
                  <div className="flex gap-4 mt-4 text-xs text-text-gray font-medium">
                     <span className="flex items-center gap-1"><Phone size={14} /> {viewingStudent.phone}</span>
                     <span className="flex items-center gap-1"><Calendar size={14} /> Enrolled: {viewingStudent.enrollmentDate}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingStudent(null)} className="text-text-gray hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Financial Summary Card */}
               <div className="lg:col-span-1 space-y-6">
                 <div className="bg-bg-black rounded-2xl p-6 border border-border shadow-inner">
                   <p className="text-[10px] font-bold text-text-gray uppercase tracking-widest mb-4">Financial Overview</p>
                   <div className="space-y-4">
                      <div>
                        <p className="text-xs text-text-gray/70">Total Expected</p>
                        <p className="text-xl font-bold">GH₵ {(viewingStudent.tuitionTotal || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-gray/70">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-400">GH₵ {totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs text-text-gray/70">Outstanding Balance</p>
                        <p className={cn("text-2xl font-black", balance > 0 ? "text-rose-400" : "text-emerald-400")}>
                          GH₵ {balance.toLocaleString()}
                        </p>
                      </div>
                   </div>
                 </div>

                 <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                   <p className="text-[10px] font-bold text-text-gray uppercase tracking-widest mb-1">Last Payment</p>
                   {lastPayment ? (
                     <div className="flex justify-between items-end">
                       <p className="font-bold text-sm">GH₵ {lastPayment.amount.toLocaleString()}</p>
                       <p className="text-[10px] text-text-gray">{format(lastPayment.date.toDate(), 'MMM dd, yyyy')}</p>
                     </div>
                   ) : (
                     <p className="text-xs text-text-gray italic">No payments recorded</p>
                   )}
                 </div>
               </div>

               {/* Activity Log / Portfolio Placeholder */}
               <div className="lg:col-span-2 space-y-8">
                 <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                       <CreditCard size={16} className="text-primary" />
                       Recent Payments
                    </h4>
                    <div className="bg-bg-black rounded-xl border border-border overflow-hidden">
                       <table className="w-full text-left text-xs">
                          <thead className="bg-white/5">
                             <tr className="text-text-gray/50 uppercase font-bold text-[10px]">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Status</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                             {studentPayments.length === 0 ? (
                               <tr><td colSpan={3} className="p-4 text-center text-text-gray italic">No transactions found.</td></tr>
                             ) : (
                               studentPayments.slice(0, 5).map(p => (
                                 <tr key={p.id}>
                                    <td className="px-4 py-3">{format(p.date.toDate(), 'PP')}</td>
                                    <td className="px-4 py-3 font-bold">GH₵ {p.amount.toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                      <span className={cn("status-tag", p.status === 'paid' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500")}>
                                        {p.status}
                                      </span>
                                    </td>
                                 </tr>
                               ))
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>

                  <div className="pt-6 border-t border-border">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={16} className="text-primary" />
                        Design Portfolio
                      </h4>
                      <label className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg border border-primary/20 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Add Work
                        <input type="file" className="hidden" onChange={handlePortfolioUpload} accept="image/*" disabled={isUploading} />
                      </label>
                    </div>
                    
                    {portfolioItems.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-gray/50 italic">
                         <p className="text-[10px] font-bold uppercase tracking-widest">No designs uploaded yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolioItems.map(item => (
                          <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-bg-black">
                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                               <button onClick={() => deletePortfolioItem(item.id)} className="p-2 bg-rose-500 rounded-lg text-white hover:bg-rose-600 transition-colors">
                                 <Trash2 size={16} />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-bold uppercase tracking-tighter flex items-center gap-2">
                {editingStudent ? <Edit2 size={20} className="text-primary" /> : <UserPlus size={20} className="text-primary" />}
                {editingStudent ? 'Edit Student' : 'Enroll New Student'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-4 pb-4 border-b border-white/5">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('photo-upload')?.click()}>
                  <div className="w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-border flex flex-col items-center justify-center text-text-gray hover:border-primary/50 transition-all overflow-hidden bg-center bg-cover" style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : {}}>
                    {!photoPreview && (
                      <>
                        <Camera size={24} />
                        <span className="text-[9px] mt-2 font-black uppercase">Photo</span>
                      </>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                    <Plus size={20} className="text-white" />
                  </div>
                </div>
                <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleEnrollmentPhotoChange} />
                <p className="text-[9px] font-bold text-text-gray uppercase tracking-widest">
                  {photoPreview ? 'Click to change photo' : 'Click to upload profile photo'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <UserPlus size={12} />
                    Full Name
                  </label>
                  <input {...register('fullName')} className="input-field" placeholder="John Doe" />
                  {errors.fullName && <p className="text-rose-500 text-[10px] mt-1 uppercase font-bold">{errors.fullName.message}</p>}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Phone size={12} />
                    Phone Number
                  </label>
                  <input {...register('phone')} className="input-field" placeholder="+233..." />
                  {errors.phone && <p className="text-rose-500 text-[10px] mt-1 uppercase font-bold">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Mail size={12} />
                    Email (Optional)
                  </label>
                  <input {...register('email')} className="input-field" placeholder="student@email.com" />
                  {errors.email && <p className="text-rose-500 text-[10px] mt-1 uppercase font-bold">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <GraduationCap size={12} />
                    Course
                  </label>
                  <input {...register('course')} className="input-field" placeholder="Fashion Design Level 1" />
                  {errors.course && <p className="text-rose-500 text-[10px] mt-1 uppercase font-bold">{errors.course.message}</p>}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Activity size={12} />
                    Specialization
                  </label>
                  <input {...register('specialization')} className="input-field" placeholder="Tailoring / Styling..." />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <DollarSign size={12} />
                    Total Tuition (GH₵)
                  </label>
                  <input type="number" {...register('tuitionTotal')} className="input-field" placeholder="Expected amount" />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Calendar size={12} />
                    Enrollment Date
                  </label>
                  <input type="date" {...register('enrollmentDate')} className="input-field" />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Activity size={12} />
                    Account Status
                  </label>
                  <select {...register('status')} className="input-field appearance-none bg-bg-dark">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Additional Notes</label>
                <textarea {...register('notes')} className="input-field h-24 resize-none" placeholder="Allergic to cotton, preferred weekend classes..."></textarea>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={closeModal} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-lg transition-all border border-white/10">
                  Cancel
                </button>
                <button type="submit" disabled={isUploading} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                  {isUploading && <Loader2 size={18} className="animate-spin" />}
                  {editingStudent ? 'Save Changes' : 'Complete Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
