import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { Activity, Plus, Search, Filter, Edit2, Trash2, X, Phone, Mail, GraduationCap, Calendar, UserPlus, CreditCard, DollarSign, Camera, Image as ImageIcon, Loader2, Printer, FileText, Receipt, Pencil, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generateEnrollmentPDF, generateInvoicePDF, generateReceiptPDF } from '../lib/receipt';
import { syncStudentBalance } from '../lib/finance';

const studentSchema = z.object({
  // CORE FIELDS (For compatibility)
  fullName: z.string().min(3, 'Full name is required'),
  course: z.string().min(1, 'Course is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  status: z.enum(['pending', 'active', 'suspended', 'completed', 'dropped']),
  enrollmentDate: z.string(),
  tuitionTotal: z.coerce.number().min(0).default(0),
  amountPaid: z.coerce.number().min(0).default(0),
  balance: z.coerce.number().default(0),
  photoUrl: z.string().optional(),

  // PERSONAL INFORMATION
  surname: z.string().min(1, 'Surname is required'),
  firstName: z.string().min(1, 'First name is required'),
  otherNames: z.string().optional(),
  gender: z.enum(['Male', 'Female']),
  dob: z.string().optional(),
  age: z.coerce.number().optional(),
  nationality: z.string().optional(),
  region: z.string().optional(),
  hometown: z.string().optional(),
  placeOfBirth: z.string().optional(),
  address: z.string().optional(),
  digitalAddress: z.string().optional(),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  maritalStatus: z.enum(['Single', 'Married', 'Other']).optional(),
  
  // IDENTIFICATION
  idType: z.enum(['Ghana Card', 'Voter ID', 'Passport', 'Other']).optional(),
  idNumber: z.string().optional(),
  idDocUrl: z.string().optional(),

  // GUARDIAN INFO
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianAddress: z.string().optional(),
  guardianOccupation: z.string().optional(),
  
  secondaryGuardianName: z.string().optional(),
  secondaryGuardianRelationship: z.string().optional(),
  secondaryGuardianPhone: z.string().optional(),
  secondaryGuardianAddress: z.string().optional(),
  
  // EDUCATION
  educationLevel: z.enum(['None', 'Basic', 'JHS', 'SHS', 'Tertiary']).optional(),
  lastSchool: z.string().optional(),
  programStudied: z.string().optional(),
  yearCompleted: z.string().optional(),
  qualifications: z.string().optional(),
  
  // PROGRAM DETAILS
  courseOther: z.string().optional(),
  specialization: z.enum(['Bridal', 'Casual Wear', 'Men\'s Wear', 'Children\'s Wear', 'Other']).optional(),
  duration: z.string().optional(),
  mode: z.enum(['Full-Time', 'Part-Time']).optional(),
  batch: z.string().optional(),
  startDate: z.string().optional(),
  expectedCompletionDate: z.string().optional(),
  
  // FINANCIALS
  tuitionFee: z.coerce.number().min(0).default(0),
  uniformFee: z.coerce.number().min(0).default(0),
  sewingKitsFee: z.coerce.number().min(0).default(0),
  paymentPlan: z.enum(['Full Payment', 'Installments']).optional(),
  firstPaymentDate: z.string().optional(),
  secondPaymentDate: z.string().optional(),
  finalPaymentDate: z.string().optional(),
  paymentMethod: z.enum(['Cash', 'Mobile Money', 'Bank Transfer']).optional(),
  receiptNo: z.string().optional(),

  // MATERIALS
  hasStarterKit: z.enum(['Yes', 'No']).optional(),
  toolsIssued: z.array(z.string()).default([]),
  starterKitFrenchCurves: z.boolean().default(false),
  starterKitSewingKits: z.boolean().default(false),

  // HEALTH
  hasMedicalCondition: z.enum(['Yes', 'No']).optional(),
  medicalDetails: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),

  // AGREEMENT
  declarationConfirmed: z.boolean().refine(v => v === true, 'You must confirm accuracy'),
  studentSignature: z.string().min(1, 'Signature is required'),
  notes: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export function Students() {
  const { isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isStaffValue = isAdmin || userRole === 'staff';
  
  const handlePrintEnrollment = async (student: any) => {
    try {
      toast.loading('Preparing enrollment document...');
      await generateEnrollmentPDF({ student });
      toast.dismiss();
      toast.success('Enrollment form downloaded');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrintInvoice = async (student: any) => {
    try {
      toast.loading('Generating invoice...');
      await generateInvoicePDF(student);
      toast.dismiss();
      toast.success('Invoice downloaded');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);

  // Auto-open detail from URL
  useEffect(() => {
    const studentId = searchParams.get('id');
    if (studentId && students.length > 0) {
      const student = students.find(s => s.id === studentId);
      if (student) {
        setViewingStudent(student);
      }
    }
  }, [searchParams, students]);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  
  // For Enrollment Photo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // For Enrollment Documents
  const [selectedIDFile, setSelectedIDFile] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(studentSchema),
    defaultValues: { 
      status: 'active', 
      enrollmentDate: format(new Date(), 'yyyy-MM-dd'), 
      tuitionFee: 0,
      uniformFee: 500,
      sewingKitsFee: 250,
      tuitionTotal: 0,
      amountPaid: 0,
      gender: 'Female',
      educationLevel: 'SHS',
      course: 'Dressmaking / Fashion Design',
      paymentPlan: 'Installments',
      mode: 'Full-Time',
      hasStarterKit: 'No',
      starterKitFrenchCurves: false,
      starterKitSewingKits: false,
      hasMedicalCondition: 'No',
      declarationConfirmed: false,
      toolsIssued: []
    }
  });

  const watchDOB = watch('dob');
  const watchTuitionFee = watch('tuitionFee', 0);
  const watchUniformFee = watch('uniformFee', 0);
  const watchSewingKitsFee = watch('sewingKitsFee', 0);
  const watchPaid = watch('amountPaid', 0);
  const watchCourse = watch('course');
  const watchSurname = watch('surname', '');
  const watchFirstName = watch('firstName', '');
  const watchOtherNames = watch('otherNames', '');

  // Auto-calculate Full Name
  useEffect(() => {
    const full = `${watchSurname} ${watchFirstName} ${watchOtherNames}`.trim();
    setValue('fullName', full);
  }, [watchSurname, watchFirstName, watchOtherNames, setValue]);

  // Auto-calculate Age
  useEffect(() => {
    if (watchDOB) {
      const birthDate = new Date(watchDOB);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setValue('age', age > 0 ? age : 0);
    }
  }, [watchDOB, setValue]);

  const watchTuitionTotal = watch('tuitionTotal', 0);

  const tuitionTotalCalculated = 
    (Number(watchTuitionFee) || 0) + 
    (Number(watchUniformFee) || 0) + 
    (Number(watchSewingKitsFee) || 0);

  // Sync balance when total expected or paid changes
  useEffect(() => {
    const calcBal = Math.max(0, (Number(watchTuitionTotal) || 0) - (Number(watchPaid) || 0));
    setValue('balance', calcBal);
  }, [watchTuitionTotal, watchPaid, setValue]);

  // Sync tuitionTotal ONLY for new students when fees change
  useEffect(() => {
    if (!editingStudent) {
      setValue('tuitionTotal', tuitionTotalCalculated);
    }
  }, [tuitionTotalCalculated, editingStudent, setValue]);

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

  const coreTotalPaid = studentPayments
    .filter(p => p.status === 'paid' && (!p.category || p.category === 'tuition' || p.category === 'enrollment' || p.category === 'other'))
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  
  const balance = (Number(viewingStudent?.tuitionTotal) || 0) - coreTotalPaid;
  const lastPayment = studentPayments.length > 0 
    ? [...studentPayments].sort((a, b) => (b.date?.toDate?.() || 0) - (a.date?.toDate?.() || 0))[0]
    : null;

  const handleDownloadReceipt = (payment: any) => {
    if (!payment) return;
    generateReceiptPDF({
      receiptNo: payment.receiptNo || 'N/A',
      studentName: viewingStudent?.fullName || 'Student',
      studentCourse: viewingStudent?.course || 'General Program',
      amount: payment.amount || 0,
      balance: (viewingStudent?.tuitionTotal || 0) - coreTotalPaid,
      tuitionTotal: viewingStudent?.tuitionTotal || 0,
      totalPaid: coreTotalPaid,
      date: payment.date?.toDate ? payment.date.toDate() : new Date(),
      method: payment.method || 'Cash',
      category: payment.category || 'tuition',
      notes: payment.notes,
      recordedBy: payment.recordedBy
    });
  };

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
        reject(new Error('Upload timed out. The file might be too large or your connection is slow. We cancelled the upload after 5 minutes.'));
      }, 300000); // 5 minute timeout

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        }, 
        (error) => {
          clearTimeout(timeout);
          console.error('Firebase Storage Error:', error);
          
          let message = 'Upload failed: ';
          if (error.code === 'storage/unauthorized') {
            message += 'Authentication error. Your account may not have permission to upload files.';
          } else if (error.code === 'storage/retry-limit-exceeded') {
            message += 'Network error or Storage bucket not found.';
          } else if (error.code === 'storage/canceled') {
            message += 'Upload was cancelled (possibly due to timeout).';
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
      let finalIdDocUrl = editingStudent?.idDocUrl || '';
      
      if (selectedFile) {
        finalPhotoUrl = await uploadFile(selectedFile, 'students');
      }
      if (selectedIDFile) {
        finalIdDocUrl = await uploadFile(selectedIDFile, 'docs');
      }

      const payload = {
        ...data,
        photoUrl: finalPhotoUrl,
        idDocUrl: finalIdDocUrl,
        updatedAt: serverTimestamp()
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), payload);
        // Recalculate balance based on actual payments source of truth
        await syncStudentBalance(editingStudent.id);
        toast.success('Student record updated and balance synced', { id: toastId });
      } else {
        const docRef = await addDoc(collection(db, 'students'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        
        // If initial deposit was provided, record it in the payments ledger
        if (data.amountPaid > 0) {
          await addDoc(collection(db, 'payments'), {
            studentId: docRef.id,
            amount: Number(data.amountPaid),
            date: new Date(),
            method: 'cash',
            status: 'paid',
            notes: 'Initial deposit during enrollment',
            recordedBy: userRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        // Even for new students, sync just to be safe (sets initial balance correctly)
        await syncStudentBalance(docRef.id);
        toast.success('Student enrolled successfully', { id: toastId });
      }
      
      setSelectedFile(null);
      setSelectedIDFile(null);
      setPhotoPreview(null);
      setIdDocPreview(null);
      closeModal();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save student data: ' + (error.message || 'Unknown error'), { id: toastId });
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

  const handleIDDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) return toast.error('File too large. Max 8MB.');
      setSelectedIDFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setIdDocPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const openModal = (student?: any) => {
    setSelectedFile(null);
    setSelectedIDFile(null);
    setPhotoPreview(null);
    setIdDocPreview(null);
    if (student) {
      setEditingStudent(student);
      setPhotoPreview(student.photoUrl || null);
      setIdDocPreview(student.idDocUrl || null);
      
      reset({
        ...student,
        status: ['active', 'pending', 'completed', 'suspended', 'dropped'].includes(student.status) ? student.status : 'active',
        gender: student.gender || 'Female',
        educationLevel: student.educationLevel || 'SHS',
        paymentPlan: student.paymentPlan || 'Installments',
        maritalStatus: student.maritalStatus || 'Single',
        idType: student.idType || 'Ghana Card',
        mode: student.mode || 'Full-Time',
        hasStarterKit: student.hasStarterKit || 'No',
        hasMedicalCondition: student.hasMedicalCondition || 'No',
        toolsIssued: student.toolsIssued || []
      });
    } else {
      setEditingStudent(null);
      reset({ 
        status: 'active', 
        enrollmentDate: format(new Date(), 'yyyy-MM-dd'),
        gender: 'Female',
        educationLevel: 'SHS',
        paymentPlan: 'Installments',
        course: 'Dressmaking / Fashion Design',
        mode: 'Full-Time',
        maritalStatus: 'Single',
        idType: 'Ghana Card',
        tuitionTotal: 0,
        amountPaid: 0,
        tuitionFee: 0,
        uniformFee: 500,
        sewingKitsFee: 250,
        hasStarterKit: 'No',
        starterKitFrenchCurves: false,
        starterKitSewingKits: false,
        hasMedicalCondition: 'No',
        declarationConfirmed: false,
        toolsIssued: []
      });
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
                  <h3 className="text-2xl font-black uppercase tracking-tight">{viewingStudent.surname}, {viewingStudent.firstName}</h3>
                  <p className="text-primary font-black uppercase tracking-[0.2em] text-[10px] mt-1">{viewingStudent.course} • {viewingStudent.specialization || 'Professional Track'}</p>
                  <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-text-gray font-black uppercase tracking-widest">
                     <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5"><Phone size={12} className="text-primary" /> {viewingStudent.phone}</span>
                     <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5"><Calendar size={12} className="text-primary" /> ADMITTED: {viewingStudent.enrollmentDate}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handlePrintEnrollment(viewingStudent)}
                  className="p-2 h-10 bg-white/5 hover:bg-white/10 rounded-xl text-text-gray hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/10 px-4"
                  title="Print Enrollment Form"
                >
                  <Printer size={16} />
                  Form
                </button>
                <button 
                  onClick={() => handlePrintInvoice(viewingStudent)}
                  className="p-2 h-10 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-primary/20 px-4"
                  title="Print Pro-Forma Invoice"
                >
                  <Printer size={16} />
                  Invoice
                </button>
                <button onClick={() => { setViewingStudent(null); setSearchParams({}); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
               {/* Left Column: Profile & Financials */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-bg-black rounded-3xl p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all"></div>
                    <p className="text-[10px] font-black text-text-gray uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Financial Protocol</p>
                    <div className="space-y-5">
                       <div>
                         <p className="text-[9px] text-text-gray/50 uppercase font-bold">Total Contract</p>
                         <p className="text-xl font-black">GH₵ {(viewingStudent.tuitionTotal || 0).toLocaleString()}</p>
                       </div>
                       <div>
                         <p className="text-[9px] text-text-gray/50 uppercase font-bold">Amount Paid (Tuition)</p>
                         <p className="text-xl font-black text-emerald-400">GH₵ {coreTotalPaid.toLocaleString()}</p>
                       </div>
                       <div className="pt-4 border-t border-white/5">
                         <p className="text-[9px] text-text-gray/50 uppercase font-bold">Balance Due</p>
                         <p className={cn("text-2xl font-black", balance > 0 ? "text-rose-500" : "text-emerald-500")}>
                           GH₵ {balance.toLocaleString()}
                         </p>
                       </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-black text-text-gray uppercase tracking-widest">Fee Breakdown</p>
                      <button 
                        onClick={() => {
                          closeModal();
                          navigate(`/payments?search=${viewingStudent.fullName}`);
                        }}
                        className="text-[9px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                      >
                        <Settings size={10} />
                        Manage
                      </button>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] uppercase font-bold text-text-gray">
                          <span>Total Recorded</span>
                          <span className="text-white">GH₵ {studentPayments.filter(p => p.status === 'paid').reduce((a,c) => a + (c.amount || 0), 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-[10px] uppercase font-bold text-text-gray">
                          <span>Applied to Balance</span>
                          <span className="text-emerald-400">GH₵ {coreTotalPaid.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-[10px] uppercase font-bold text-text-gray">
                          <span>Auxiliary Payments</span>
                          <span className="text-amber-400">GH₵ {studentPayments.filter(p => p.status === 'paid' && p.category && !['tuition', 'enrollment', 'other'].includes(p.category)).reduce((a,c) => a + (c.amount || 0), 0).toLocaleString()}</span>
                       </div>
                    </div>
                  </div>

                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <p className="text-[10px] font-black text-text-gray uppercase tracking-widest mb-1">Administrative Info</p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-gray font-bold uppercase">Status</span>
                        <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", viewingStudent.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-text-gray border border-white/10")}>{viewingStudent.status}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-gray font-bold uppercase">Intake Batch</span>
                        <span className="text-[10px] font-black text-white uppercase">{viewingStudent.batch || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-gray font-bold uppercase">Study Mode</span>
                        <span className="text-[10px] font-black text-primary uppercase">{viewingStudent.mode || 'FULL-TIME'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {viewingStudent.idDocUrl && (
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] font-black text-text-gray uppercase tracking-widest mb-3">ID Document</p>
                        <a href={viewingStudent.idDocUrl} target="_blank" rel="noreferrer" className="block w-full h-24 rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-all bg-black/40">
                           <img src={viewingStudent.idDocUrl} alt="ID Scan" className="w-full h-full object-cover grayscale opacity-50 hover:opacity-100 hover:grayscale-0 transition-all" />
                        </a>
                     </div>
                  )}
                </div>

               {/* Middle & Right Column: Detailed Information */}
               <div className="lg:col-span-3 space-y-10">
                 {/* 1. Personal & Contact */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                       Personal Details
                     </h4>
                     <div className="grid grid-cols-2 gap-y-3">
                       <div>
                         <p className="text-[10px] text-text-gray uppercase">Gender</p>
                         <p className="text-sm font-medium">{viewingStudent.gender || 'Not specified'}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-text-gray uppercase">DOB</p>
                         <p className="text-sm font-medium">{viewingStudent.dob || 'Not specified'}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-text-gray uppercase">Nationality</p>
                         <p className="text-sm font-medium">{viewingStudent.nationality || 'Not specified'}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-text-gray uppercase">Region</p>
                         <p className="text-sm font-medium">{viewingStudent.region || 'Not specified'}</p>
                       </div>
                       <div className="col-span-2">
                         <p className="text-[10px] text-text-gray uppercase">Residential Address</p>
                         <p className="text-sm font-medium">{viewingStudent.address || 'Address not listed'}</p>
                       </div>
                     </div>
                   </div>

                   <div className="space-y-4">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                       Guardian Information
                     </h4>
                     <div className="space-y-3">
                       <div>
                         <p className="text-[10px] text-text-gray uppercase">Primary Guardian</p>
                         <p className="text-sm font-medium">{viewingStudent.guardianName || 'N/A'}</p>
                         <p className="text-[11px] text-primary/70">{viewingStudent.guardianRelationship}</p>
                       </div>
                       <div>
                         <p className="text-[10px] text-text-gray uppercase">Contact Phone</p>
                         <p className="text-sm font-medium">{viewingStudent.guardianPhone || 'N/A'}</p>
                       </div>
                        <div>
                         <p className="text-[10px] text-text-gray uppercase">Guardian Address</p>
                         <p className="text-sm font-medium">{viewingStudent.guardianAddress || 'N/A'}</p>
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* 2. Education & Program */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                        Education & Training
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-text-gray uppercase">Highest Level</p>
                          <p className="text-sm font-medium">{viewingStudent.educationLevel || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-gray uppercase">Last Institution</p>
                          <p className="text-sm font-medium">{viewingStudent.lastSchool || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-gray uppercase">Specialization</p>
                          <p className="text-sm font-medium italic">{viewingStudent.specialization || 'General Fashion'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                        Enrollment Status
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-text-gray uppercase">Enrollment Date</p>
                            <p className="text-sm font-medium">{viewingStudent.enrollmentDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-text-gray uppercase">Course Duration</p>
                            <p className="text-sm font-medium">{viewingStudent.duration || 'Standard'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-text-gray uppercase">Payment Plan</p>
                          <p className="text-sm font-medium border-l-2 border-primary pl-2">{viewingStudent.paymentPlan || 'Flexible'}</p>
                        </div>
                      </div>
                    </div>
                 </div>

                 {/* 3. Portfolio & Notes */}
                 <div className="space-y-8 pt-6 border-t border-white/5">
                   {viewingStudent.notes && (
                     <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Dean's Office Notes</p>
                        <p className="text-xs text-text-gray leading-relaxed">{viewingStudent.notes}</p>
                     </div>
                   )}

                   <div>
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
                       <div className="h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-gray/50 italic bg-white/5">
                          <p className="text-[10px] font-bold uppercase tracking-widest">No designs uploaded yet</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                         {portfolioItems.map(item => (
                           <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-bg-black">
                             <img src={item.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => deletePortfolioItem(item.id)} className="p-3 bg-rose-500 rounded-xl text-white hover:bg-rose-600 transition-all transform hover:scale-110 shadow-lg">
                                  <Trash2 size={18} />
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
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 sticky top-0 z-20 backdrop-blur-md">
              <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                {editingStudent ? <Edit2 size={20} className="text-primary" /> : <UserPlus size={20} className="text-primary" />}
                {editingStudent ? 'Edit Student Record' : 'Institutional Enrollment Protocol'}
              </h3>
              <div className="flex items-center gap-4">
                 <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                   {editingStudent ? 'Database Sync' : 'New Admission'}
                 </p>
                 <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                   <X size={24} />
                 </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-0 space-y-0">
               {/* STICKY PROGRESS INDICATOR (Optional but good) */}
               <div className="bg-bg-dark border-b border-white/5 p-4 flex gap-2 overflow-x-auto scrollbar-hide">
                  {['Personal', 'Guardian', 'Education', 'Program', 'Finance', 'Others'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </div>
                      <span className="text-[10px] font-bold text-text-gray uppercase tracking-widest">{step}</span>
                      {i < 5 && <div className="w-4 h-[1px] bg-white/10" />}
                    </div>
                  ))}
               </div>

              <div className="p-8 space-y-8">
                {/* 1. STUDENT PHOTO & BASIC INFO */}
                <div className="flex flex-col md:flex-row gap-8 pb-8 border-b border-white/5">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('photo-upload')?.click()}>
                      <div className="w-40 h-40 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-text-gray hover:border-primary/50 transition-all overflow-hidden bg-center bg-cover shadow-2xl" style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : {}}>
                        {!photoPreview && (
                          <>
                            <Camera size={32} className="text-primary/40" />
                            <span className="text-[10px] mt-2 font-black uppercase tracking-widest text-text-gray/50 text-center px-4">Official Student Passport</span>
                          </>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 size={32} className="animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Camera size={18} className="text-white" />
                      </div>
                    </div>
                    <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handleEnrollmentPhotoChange} />
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="field-label">Surname *</label>
                      <input {...register('surname')} className="input-field" placeholder="Family Name" />
                      {errors.surname && <p className="error-text">{errors.surname.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">First Name *</label>
                      <input {...register('firstName')} className="input-field" placeholder="Given Name" />
                      {errors.firstName && <p className="error-text">{errors.firstName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Other Names</label>
                      <input {...register('otherNames')} className="input-field" placeholder="Middle Names" />
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Gender *</label>
                      <select {...register('gender')} className="input-field appearance-none bg-bg-dark">
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Date of Birth *</label>
                      <input type="date" {...register('dob')} className="input-field" />
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Calculated Age</label>
                      <div className="h-[46px] flex items-center px-4 bg-white/5 rounded-lg border border-white/10 font-black text-primary">
                        {watch('age', 0)} Years Old
                      </div>
                    </div>
                  </div>
                </div>

                {/* ANIMATED ACCORDION SECTIONS */}
                <div className="space-y-4">
                  {/* SECTON: PERSONAL DETAILS */}
                  <details open className="group bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all">
                    <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-open:bg-primary group-open:text-white transition-all">
                          <UserPlus size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Advanced Personal Data</h4>
                          <p className="text-[10px] text-text-gray font-bold uppercase mt-0.5">Place of birth, nationality, residency</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-text-gray group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                      <div className="space-y-2">
                        <label className="field-label">Nationality</label>
                        <input {...register('nationality')} className="input-field" placeholder="e.g. Ghanaian" />
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Region of Origin</label>
                        <input {...register('region')} className="input-field" placeholder="e.g. Greater Accra" />
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Hometown</label>
                        <input {...register('hometown')} className="input-field" placeholder="City / Town" />
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Place of Birth</label>
                        <input {...register('placeOfBirth')} className="input-field" placeholder="Hospital / Town" />
                      </div>
                      <div className="space-y-2">
                         <label className="field-label">Marital Status</label>
                         <select {...register('maritalStatus')} className="input-field appearance-none bg-bg-dark">
                           <option value="Single">Single</option>
                           <option value="Married">Married</option>
                           <option value="Other">Other</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Digital Address (GPS)</label>
                        <input {...register('digitalAddress')} className="input-field font-mono" placeholder="GW-1234-5678" />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="field-label">Full Residential Address</label>
                        <input {...register('address')} className="input-field" placeholder="House No, Street Name, Landmark" />
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Primary Phone *</label>
                        <input {...register('phone')} className="input-field" placeholder="+233..." />
                        {errors.phone && <p className="error-text">{errors.phone.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Secondary / Alt Phone</label>
                        <input {...register('alternatePhone')} className="input-field" placeholder="Alternative contact" />
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Official Email</label>
                        <input {...register('email')} className="input-field" placeholder="student@agency.com" />
                      </div>
                    </div>
                  </details>

                  {/* SECTION: IDENTIFICATION */}
                  <details className="group bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all">
                    <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-open:bg-primary group-open:text-white transition-all">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Identification Protocol</h4>
                          <p className="text-[10px] text-text-gray font-bold uppercase mt-0.5">Government IDs & Documents</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-text-gray group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="p-6 pt-0 space-y-6 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <label className="field-label">ID Type</label>
                           <select {...register('idType')} className="input-field appearance-none bg-bg-dark">
                             <option value="Ghana Card">Ghana Card</option>
                             <option value="Voter ID">Voter ID</option>
                             <option value="Passport">Passport</option>
                             <option value="Other">Other</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="field-label">ID Document Number</label>
                           <input {...register('idNumber')} className="input-field font-mono" placeholder="GHA-1234567-8" />
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Official ID Scan / Upload</label>
                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('id-upload')?.click()}>
                           {idDocPreview ? (
                             <div className="w-full h-40 rounded-xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all">
                                <img src={idDocPreview} alt="ID Document Preview" className="w-full h-full object-contain bg-black/40" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                   <p className="text-[10px] font-black uppercase text-white bg-primary px-3 py-1 rounded-full">Replace Document</p>
                                </div>
                             </div>
                           ) : (
                             <div className="w-full h-32 rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-text-gray hover:border-primary/50 transition-all">
                                <Plus size={24} className="text-primary/40" />
                                <p className="text-[10px] font-black uppercase mt-2">Click to upload ID document (PNG/JPG)</p>
                             </div>
                           )}
                        </div>
                        <input id="id-upload" type="file" className="hidden" accept="image/*" onChange={handleIDDocChange} />
                      </div>
                    </div>
                  </details>

                  {/* SECTION: GUARDIAN DETAILS */}
                  <details className="group bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all">
                    <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-open:bg-primary group-open:text-white transition-all">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Guardian / Next of Kin</h4>
                          <p className="text-[10px] text-text-gray font-bold uppercase mt-0.5">Primary and secondary emergency contacts</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-text-gray group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="p-6 pt-0 space-y-8 animate-in slide-in-from-top-4 duration-300">
                      <div>
                        <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Primary Representative</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="field-label">Full Name</label>
                            <input {...register('guardianName')} className="input-field" placeholder="Guardian's Name" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <label className="field-label">Relationship</label>
                               <input {...register('guardianRelationship')} className="input-field" placeholder="Father, Mother, etc." />
                             </div>
                             <div className="space-y-2">
                               <label className="field-label">Occupation</label>
                               <input {...register('guardianOccupation')} className="input-field" placeholder="Enter Job" />
                             </div>
                          </div>
                          <div className="space-y-2">
                            <label className="field-label">Phone Number</label>
                            <input {...register('guardianPhone')} className="input-field" placeholder="+233..." />
                          </div>
                          <div className="space-y-2">
                            <label className="field-label">Residential Address</label>
                            <input {...register('guardianAddress')} className="input-field" placeholder="Guardian's Address" />
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <h5 className="text-[10px] font-black text-text-gray uppercase tracking-[0.2em] mb-4">Secondary Representative (Optional)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80">
                           <div className="space-y-2">
                             <label className="field-label">Secondary Guardian Name</label>
                             <input {...register('secondaryGuardianName')} className="input-field" placeholder="Name" />
                           </div>
                           <div className="space-y-2">
                             <label className="field-label">Secondary Phone</label>
                             <input {...register('secondaryGuardianPhone')} className="input-field" placeholder="Phone" />
                           </div>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* SECTION: EDUCATIONAL BACKGROUND */}
                  <details className="group bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all">
                    <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-open:bg-primary group-open:text-white transition-all">
                          <GraduationCap size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Educational Experience</h4>
                          <p className="text-[10px] text-text-gray font-bold uppercase mt-0.5">Previous training & qualifications</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-text-gray group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                      <div className="space-y-2">
                        <label className="field-label">Highest Level Attained</label>
                        <select {...register('educationLevel')} className="input-field appearance-none bg-bg-dark">
                          <option value="None">No Formal Education</option>
                          <option value="Basic">Basic Education</option>
                          <option value="JHS">JHS Graduate</option>
                          <option value="SHS">SHS Graduate</option>
                          <option value="Tertiary">Tertiary / University</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Last Institution Attended</label>
                        <input {...register('lastSchool')} className="input-field" placeholder="School Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Program Studied</label>
                        <input {...register('programStudied')} className="input-field" placeholder="Course Name" />
                      </div>
                      <div className="space-y-2">
                        <label className="field-label">Year of Completion</label>
                        <input {...register('yearCompleted')} className="input-field" placeholder="e.g. 2022" />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="field-label">Qualifications Obtained</label>
                        <input {...register('qualifications')} className="input-field" placeholder="e.g. WASSCE, Diploma, Degree" />
                      </div>
                    </div>
                  </details>

                  {/* SECTION: PROGRAM DETAILS */}
                  <details className="group bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all">
                    <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-open:bg-primary group-open:text-white transition-all">
                          <Edit2 size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Program Registration</h4>
                          <p className="text-[10px] text-text-gray font-bold uppercase mt-0.5">Course selection & specialization</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-text-gray group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="p-6 pt-0 space-y-8 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="field-label">Academic Program</label>
                          <select {...register('course')} className="input-field appearance-none bg-bg-dark">
                            <option value="">Select Program</option>
                            <option value="Diploma Certification">Diploma Certification - 1 and half years with 6 months internship</option>
                            <option value="Advance Certification">Advance Certification - 1 year with 6 months internship</option>
                            <option value="Advance - Free Hand Cutting">Advance - Free Hand Cutting - 1 year with internship</option>
                            <option value="Certificate Programme">Certificate Programme - 6 months</option>
                            <option value="Free Hand Cutting - Original">Free Hand Cutting (1 year + internship)</option>
                            <option value="Dressmaking / Fashion Design">Dressmaking / Fashion Design</option>
                            <option value="Tailoring">Tailoring</option>
                            <option value="Advanced Fashion">Advanced Fashion</option>
                            <option value="Other">Other (Special Request)</option>
                          </select>
                          <div className="mt-2 space-y-0.5">
                            <p className="text-[9px] text-text-gray font-bold uppercase tracking-tight">*Diploma Certification - 1 and half years with 6 months internship</p>
                            <p className="text-[9px] text-text-gray font-bold uppercase tracking-tight">*Advance Certification - 1 year with 6 months internship</p>
                            <p className="text-[9px] text-text-gray font-black uppercase tracking-tight text-primary">*Advance - Free Hand Cutting - 1 year with internship</p>
                            <p className="text-[9px] text-text-gray font-bold uppercase tracking-tight">*Certificate Programme - 6 months</p>
                          </div>
                          {watchCourse === 'Other' && (
                            <input {...register('courseOther')} className="input-field mt-3 animate-in fade-in" placeholder="Specify Program Name" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="field-label">Specialization Path</label>
                          <select {...register('specialization')} className="input-field appearance-none bg-bg-dark">
                            <option value="Bridal">Bridal & High Fashion</option>
                            <option value="Casual Wear">Ready-to-Wear / Casual</option>
                            <option value="Men's Wear">Bespoke Men's Wear</option>
                            <option value="Children's Wear">Children's Apparel</option>
                            <option value="Other">Custom Track</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                         <div className="space-y-2">
                           <label className="field-label">Academic Mode</label>
                           <select {...register('mode')} className="input-field appearance-none bg-bg-dark">
                             <option value="Full-Time">Full-Time Intensive</option>
                             <option value="Part-Time">Self-Paced / Part-Time</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="field-label">Training Duration</label>
                           <input {...register('duration')} className="input-field" placeholder="e.g. 6 Months, 1 Year" />
                         </div>
                         <div className="space-y-2">
                           <label className="field-label">Admission Batch</label>
                           <input {...register('batch')} className="input-field font-mono" placeholder="JAN-2026-B1" />
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                         <div className="space-y-2">
                           <label className="field-label">Enrollment Date</label>
                           <input type="date" {...register('enrollmentDate')} className="input-field" />
                         </div>
                         <div className="space-y-2">
                           <label className="field-label">Course Start Date</label>
                           <input type="date" {...register('startDate')} className="input-field" />
                         </div>
                         <div className="space-y-2">
                           <label className="field-label">Target Completion</label>
                           <input type="date" {...register('expectedCompletionDate')} className="input-field" />
                         </div>
                         <div className="space-y-2">
                           <label className="field-label">Initial Status</label>
                           <select {...register('status')} className="input-field appearance-none bg-bg-dark">
                             <option value="pending">Admission Pending</option>
                             <option value="active">Active Scholar</option>
                             <option value="suspended">On Academic Leave</option>
                             <option value="completed">Alumni / Completed</option>
                             <option value="dropped">Withdrawal / Dropped</option>
                           </select>
                         </div>
                      </div>
                    </div>
                  </details>

                  {/* SECTION: FINANCIALS */}
                  <details className="group bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all">
                    <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-open:bg-primary group-open:text-white transition-all">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Financial Framework</h4>
                          <p className="text-[10px] text-text-gray font-bold uppercase mt-0.5">Fees, installments, and payment plans</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-text-gray group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="p-6 pt-0 space-y-8 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/40 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-2">
                          <label className="field-label">Tuition Base Fee</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-gray">GH₵</span>
                            <input type="number" {...register('tuitionFee')} className="input-field pl-12 bg-bg-black" placeholder="0.00" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="field-label">Uniform</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-gray">GH₵</span>
                            <input type="number" {...register('uniformFee')} className="input-field pl-12 bg-bg-black" placeholder="500" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="field-label">Sewing Kits</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-gray">GH₵</span>
                            <input type="number" {...register('sewingKitsFee')} className="input-field pl-12 bg-bg-black" placeholder="250" />
                          </div>
                        </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="field-label">Total Expected *</label>
                            <button 
                              type="button"
                              onClick={() => setValue('tuitionTotal', tuitionTotalCalculated)}
                              className="text-[9px] font-black text-primary uppercase hover:underline"
                            >
                              Reset to Calculated Sum
                            </button>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-gray">GH₵</span>
                            <input 
                              type="number" 
                              {...register('tuitionTotal')} 
                              className="input-field pl-12 bg-primary/10 border-primary/20 text-primary text-xl font-black" 
                              placeholder="0.00" 
                            />
                          </div>
                          <p className="text-[9px] text-text-gray italic">Sum of Tuition, Uniform, and Sewing Kit: GH₵ {tuitionTotalCalculated.toLocaleString()}</p>
                        </div>
                        <div className="space-y-2">
                           <label className="field-label text-rose-400">Current Balance (Calculated)</label>
                           <div className="h-[46px] flex items-center px-4 bg-rose-500/5 rounded-lg border border-rose-500/20 font-black text-rose-500 text-lg">
                             GH₵ {(Number(watchTuitionTotal) - coreTotalPaid).toLocaleString()}
                           </div>
                           <p className="text-[9px] text-text-gray italic">Total Fees - Total Paid (Calculated from Ledger)</p>
                        </div>
                      </div>

                      {/* Payment History Section */}
                      <div className="pt-6 border-t border-white/5 space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Receipt size={16} />
                            Payment History (Fix mistakes in "Payments" page)
                          </h4>
                        </div>
                        
                        <div className="overflow-hidden border border-white/5 rounded-2xl">
                          <table className="w-full text-left border-collapse bg-black/20">
                            <thead>
                              <tr className="bg-white/5">
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-gray">Date</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-gray">Category</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-gray">Amount</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-gray text-right">Receipt</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {studentPayments.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-6 text-center text-text-gray italic text-xs">No payments recorded</td>
                                </tr>
                              ) : (
                                [...studentPayments].sort((a,b) => (b.date?.toDate?.() || 0) - (a.date?.toDate?.() || 0)).map(payment => (
                                  <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 text-xs text-text-gray">
                                      {payment.date?.toDate ? format(payment.date.toDate(), 'dd MMM yyyy') : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-white/10 text-white/60">
                                        {payment.category?.replace('_', ' ') || 'tuition'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-black text-white">GH₵ {payment.amount?.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex justify-end gap-2">
                                        {payment.status === 'paid' && (
                                          <button 
                                            type="button"
                                            onClick={() => handleDownloadReceipt(payment)}
                                            className="p-1 text-primary hover:bg-primary/10 rounded"
                                            title="Download Receipt"
                                          >
                                            <Printer size={12} />
                                          </button>
                                        )}
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            closeModal();
                                            navigate(`/payments?search=${viewingStudent.fullName}`);
                                          }}
                                          className="p-1 text-text-gray hover:text-white hover:bg-white/10 rounded transition-all"
                                          title="Fix/Edit in Payments Page"
                                        >
                                          <Pencil size={12} />
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-3">
                           <label className="field-label">Payment Plan</label>
                           <div className="flex gap-2">
                             {['Full Payment', 'Installments'].map(plan => (
                               <label key={plan} className="flex-1 cursor-pointer">
                                 <input type="radio" value={plan} {...register('paymentPlan')} className="hidden peer" />
                                 <div className="p-3 text-center rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:text-primary transition-all">
                                   {plan}
                                 </div>
                               </label>
                             ))}
                           </div>
                         </div>
                         <div className="space-y-2">
                           <label className="field-label text-emerald-400">{editingStudent ? 'Total Paid (Calculated from ledger)' : 'Initial Deposit (GH₵)'}</label>
                            {editingStudent && <p className="text-[10px] text-text-gray italic mt-1 font-bold">Payments must be recorded in the Payments page</p>}

                           <input type="number" {...register('amountPaid')} 
                               className={cn("input-field font-black text-emerald-400", editingStudent && "bg-white/5 opacity-70")} 
                               placeholder="0.00"
                               readOnly={!!editingStudent} 
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="field-label font-black text-primary">Receipt Number</label>
                            <input {...register('receiptNo')} className="input-field font-mono font-bold" placeholder="REC-10045" />
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                         <div className="space-y-2">
                            <label className="field-label italic">1st Installment Date</label>
                            <input type="date" {...register('firstPaymentDate')} className="input-field bg-white/5" />
                         </div>
                         <div className="space-y-2">
                            <label className="field-label italic">2nd Installment Date</label>
                            <input type="date" {...register('secondPaymentDate')} className="input-field bg-white/5" />
                         </div>
                         <div className="space-y-2">
                            <label className="field-label italic">Final Payment Date</label>
                            <input type="date" {...register('finalPaymentDate')} className="input-field bg-white/5" />
                         </div>
                      </div>

                      <div className="pt-6 border-t border-white/5 space-y-2">
                        <label className="field-label font-black text-rose-400 uppercase tracking-widest">Payment Terms & Instructions</label>
                        <p className="text-[10px] text-text-gray font-black italic">All fees paid are non-refundable.</p>
                      </div>
                    </div>
                  </details>

                  {/* SECTION: HEALTH & MATERIALS */}
                  <details className="group bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all">
                    <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-open:bg-primary group-open:text-white transition-all">
                          <Activity size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-white">Health & Material Logistics</h4>
                          <p className="text-[10px] text-text-gray font-bold uppercase mt-0.5">Medical history and starter kit issuance</p>
                        </div>
                      </div>
                      <Plus size={18} className="text-text-gray group-open:rotate-45 transition-transform" />
                    </summary>
                    <div className="p-6 pt-0 space-y-8 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-2">Medical Status</h5>
                            <div className="space-y-4">
                               <div className="flex items-center gap-4">
                                  <label className="field-label">Chronic Conditions?</label>
                                  <div className="flex gap-4">
                                     {['Yes', 'No'].map(val => (
                                       <label key={val} className="flex items-center gap-2 cursor-pointer">
                                         <input type="radio" value={val} {...register('hasMedicalCondition')} className="w-4 h-4 accent-primary" />
                                         <span className="text-xs font-bold text-text-gray">{val}</span>
                                       </label>
                                     ))}
                                  </div>
                               </div>
                               <textarea {...register('medicalDetails')} className="input-field h-20 resize-none text-xs" placeholder="Specify any allergies or medical requirements..."></textarea>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                     <label className="field-label">Emergency Contact Name</label>
                                     <input {...register('emergencyContactName')} className="input-field text-xs" placeholder="Name" />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="field-label">Emergency Contact Phone</label>
                                     <input {...register('emergencyContactPhone')} className="input-field text-xs" placeholder="Phone" />
                                  </div>
                               </div>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-text-gray uppercase tracking-widest border-b border-white/10 pb-2">Starter Kit Allocation</h5>
                            <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                                 <div>
                                   <p className="text-[9px] text-text-gray uppercase font-bold">Uniform</p>
                                   <p className="text-xs font-black">GH₵ 500.00</p>
                                 </div>
                                 <div>
                                   <p className="text-[9px] text-text-gray uppercase font-bold">Sewing kits</p>
                                   <p className="text-xs font-black">GH₵ 250.00</p>
                                 </div>
                                 <div>
                                   <p className="text-[9px] text-text-gray uppercase font-bold">Machine maintenance</p>
                                   <p className="text-[10px] font-black">GH₵ 400 (6 months)</p>
                                 </div>
                                 <div>
                                   <p className="text-[9px] text-text-gray uppercase font-bold">Admission form</p>
                                   <p className="text-xs font-black">GH₵ 200.00</p>
                                 </div>
                               </div>

                               <div className="flex items-center gap-4">
                                  <label className="field-label font-black text-white">Issue Kit?</label>
                                  <div className="flex gap-4">
                                    {['Yes', 'No'].map(val => (
                                      <label key={val} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" value={val} {...register('hasStarterKit')} className="w-4 h-4 accent-primary" />
                                        <span className="text-xs font-bold text-text-gray">{val}</span>
                                      </label>
                                    ))}
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <label className="field-label">Items Allocated</label>
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                                    <label className="flex items-center gap-3 group cursor-pointer">
                                      <input type="checkbox" {...register('starterKitFrenchCurves')} className="w-5 h-5 accent-primary rounded cursor-pointer" />
                                      <span className="text-[10px] font-black text-text-gray group-hover:text-primary transition-colors uppercase">French Curves</span>
                                    </label>
                                    <label className="flex items-center gap-3 group cursor-pointer">
                                      <input type="checkbox" {...register('starterKitSewingKits')} className="w-5 h-5 accent-primary rounded cursor-pointer" />
                                      <span className="text-[10px] font-black text-text-gray group-hover:text-primary transition-colors uppercase">Sewing Kits</span>
                                    </label>
                                    <label className="flex items-center gap-3 group cursor-pointer">
                                      <input type="checkbox" {...register('starterKitUniforms')} className="w-5 h-5 accent-primary rounded cursor-pointer" />
                                      <span className="text-[10px] font-black text-text-gray group-hover:text-primary transition-colors uppercase">Uniforms</span>
                                    </label>
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <label className="field-label">Tools Handed Over (Optional)</label>
                                  <div className="grid grid-cols-2 gap-2 p-4 bg-black/40 rounded-xl border border-white/5">
                                     {['Sewing Machine', 'Scissors', 'Measuring Tape', 'Fabric Kit'].map(tool => (
                                       <label key={tool} className="flex items-center gap-2 group cursor-pointer">
                                          <input 
                                            type="checkbox" 
                                            value={tool} 
                                            {...register('toolsIssued')} 
                                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                                          />
                                          <span className="text-[10px] font-bold text-text-gray group-hover:text-primary transition-colors uppercase">{tool}</span>
                                       </label>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         </div>
                       </div>
                    </div>
                  </details>

                  {/* SECTION: AGREEMENT & DECLARATION */}
                  <div className="p-8 bg-primary/5 rounded-3xl border border-primary/20 space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                           <FileText size={20} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-white">Enrollment Oath & Declaration</h4>
                     </div>
                     
                     <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                        <p className="text-xs text-text-gray leading-relaxed font-medium italic">
                          "I, the undersigned applicant, hereby declare that the information provided in this admission protocol is accurate, complete, and legally binding. 
                          I pledge to adhere strictly to the institutional guidelines, professional standards, and academic regulations of Charthess School of Fashion. 
                          I understand that any falsification of records may result in immediate withdrawal of admission status."
                        </p>
                        
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                              <label className="flex gap-3 items-start cursor-pointer group">
                                 <input type="checkbox" {...register('declarationConfirmed')} className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 accent-primary transition-all shadow-inner" />
                                 <div className="flex-1">
                                    <p className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-primary transition-colors">I accept the terms of enrollment</p>
                                    <p className="text-[10px] text-text-gray font-medium mt-1">Checking this box acts as a formal acknowledgement of the school's policy.</p>
                                    {errors.declarationConfirmed && <p className="error-text mt-2">{errors.declarationConfirmed.message as string}</p>}
                                 </div>
                              </label>
                           </div>
                           <div className="space-y-4">
                              <div className="space-y-2">
                                 <label className="field-label">Student Electronic Signature</label>
                                 <input {...register('studentSignature')} className="input-field font-serif text-lg italic bg-white/5 border-primary/20 text-primary border-b-2" placeholder="Student Signature" />
                                 {errors.studentSignature && <p className="error-text">{errors.studentSignature.message as string}</p>}
                                 <p className="text-[9px] text-text-gray lowercase italic">Type your full legal name as a signature</p>
                              </div>
                           </div>
                        </div>
                     </div>
                    </div>
                  </div>
                </div>

              <div className="p-8 bg-bg-black sticky bottom-0 z-50 border-t border-white/5 flex gap-4 backdrop-blur-xl bg-opacity-95">
                <button type="button" onClick={closeModal} className="px-8 bg-white/5 hover:bg-white/10 text-text-gray hover:text-white font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5">
                  Cancel
                </button>
                <div className="flex-1"></div>
                <button type="submit" disabled={isUploading} className="px-12 py-5 btn-primary flex items-center justify-center gap-4 text-sm relative group overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  {isUploading && <Loader2 size={24} className="animate-spin" />}
                  <span className="font-black uppercase tracking-[0.3em] relative z-10">
                    {editingStudent ? 'Synchronize Record' : 'Authenticate & Admit Student'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
