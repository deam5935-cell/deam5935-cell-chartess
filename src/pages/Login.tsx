import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User as UserIcon, Lock, Loader2 } from 'lucide-react';

const ADMIN_EMAILS = [
  'marufadam7777@gmail.com',
  'beisiwaa00@gmail.com',
  'r9628606@gmail.com'
];

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;
      
      const emailLower = (user.email || email).toLowerCase().trim();

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (error: any) {
        // If we can't read the doc, let's see why
        console.error('Initial getDoc error:', error);
        // If the user is an admin by email, we might want to try to create the doc anyway
        if (!ADMIN_EMAILS.includes(emailLower)) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      }

      if (!userSnap?.exists()) {
        // 1. Check if it's an initial admin
        if (ADMIN_EMAILS.includes(emailLower)) {
          try {
            await setDoc(userRef, {
              name: email.split('@')[0],
              email: emailLower,
              role: 'admin',
              createdAt: serverTimestamp()
            });
            toast.success('Admin account initialized.');
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
          }
        } else {
          // 2. Check if a record exists with this email (created by an admin but not yet linked to UID)
          try {
            const q = query(collection(db, 'users'), where('email', '==', emailLower));
            const querySnap = await getDocs(q);
            
            if (!querySnap.empty) {
              const existingRecord = querySnap.docs[0];
              const data = existingRecord.data();
              
              // Move data to the UID-based document
              // ENSURE: If the email is in the admin list, force role admin even if old record says staff
              const targetRole = ADMIN_EMAILS.includes(emailLower) ? 'admin' : (data.role || 'staff');

              await setDoc(userRef, {
                ...data,
                role: targetRole,
                createdAt: data.createdAt || serverTimestamp()
              });
              
              // Delete the old email-based document if it was a different path/ID
              if (existingRecord.id !== user.uid) {
                await deleteDoc(existingRecord.ref);
              }
              
              toast.success(targetRole === 'admin' ? 'Admin account linked.' : 'Staff account linked.');
            } else {
              toast.error('Account not authorized. contact administrator.');
              await auth.signOut();
              setLoading(false);
              return;
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'users');
          }
        }
      } else {
        // Force admin role if they are in the list but registered as staff
        const userData = userSnap.data();
        if (ADMIN_EMAILS.includes(emailLower) && userData?.role !== 'admin') {
          try {
            await updateDoc(userRef, { role: 'admin' });
            toast.success('Admin privileges updated.');
          } catch (error) {
            console.error('Failed to update admin role:', error);
          }
        }
      }

      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070a] p-4 relative overflow-hidden">
      {/* Background Watermark Layer (Dark Background + Logo Watermark) */}
      <div className="absolute inset-0 z-0">
        {/* Dark Background Base Overlay */}
        <div className="absolute inset-0 bg-[#0A0F1C]" />
        
        {/* Logo Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="opacity-[0.08] blur-[1px] w-[600px] h-[600px] md:w-[800px] md:h-[800px]">
            <img 
              src="/logo1.png" 
              alt="" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[150px] rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 blur-[180px] rounded-full" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center pt-10">
          {/* Primary Branding Logo Above Form */}
          <div className="mb-10">
             <img 
              src="/charthess_logo-1.png" 
              alt="Charthess School of Fashion Logo" 
              className="w-[320px] h-auto drop-shadow-[0_0_40px_rgba(28,163,184,0.5)] transition-all duration-700 animate-in fade-in zoom-in-95"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="glass-card p-8 md:p-10 z-20">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="name@email.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-[10px] uppercase tracking-widest">
          Private Staff Access Only
        </p>
      </div>
    </div>
  );
}
