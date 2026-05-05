import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User as UserIcon, Lock, Loader2 } from 'lucide-react';

const ADMIN_EMAILS = ['marufadam7777@gmail.com', 'beisiwaa00@gmail.com', 'r9628606@gmail.com'];

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      
      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }

      if (!userSnap?.exists()) {
        const emailLower = email.toLowerCase();

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
              await setDoc(userRef, {
                ...data,
                createdAt: data.createdAt || serverTimestamp()
              });
              
              // Delete the old email-based document if it was a different path/ID
              if (existingRecord.id !== user.uid) {
                await deleteDoc(existingRecord.ref);
              }
              
              toast.success('Staff account linked.');
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
      {/* Background Watermark Logo (Lowest Layer) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="opacity-[0.04] blur-[2px] transform scale-150">
          <img 
            src="https://kommodo.ai/i/72EuMuVxBrOvNd3WZNHq" 
            alt="" 
            className="w-full max-w-2xl object-contain"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[150px] rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 blur-[180px] rounded-full" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center">
          {/* Primary Branding Logo */}
          <div className="mb-8">
             <img 
              src="https://kommodo.ai/i/72EuMuVxBrOvNd3WZNHq" 
              alt="Charthess School of Fashion Logo" 
              className="w-[140px] h-auto drop-shadow-[0_0_20px_rgba(28,163,184,0.4)]"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
            />
          </div>
          
          <div className="text-center mb-4">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Charthess</h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.6em] text-primary mt-1 border-t border-primary/20 pt-2 inline-block">School of Fashion</p>
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
