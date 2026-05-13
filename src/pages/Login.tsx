import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { ADMIN_EMAILS } from '../lib/constants';
import { toast } from 'sonner';
import { User as UserIcon, Lock, Loader2, LogIn } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await postLoginSequencing(result.user);
    } catch (error: any) {
      console.error('Google Login error:', error);
      toast.error(error.message || 'Google Sign-In failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const postLoginSequencing = async (user: any) => {
    const emailLower = user.email?.toLowerCase().trim();
    if (!emailLower) return;

    // Check if user exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (error: any) {
      console.error('Initial getDoc error:', error);
      if (!ADMIN_EMAILS.includes(emailLower)) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    }

    if (!userSnap?.exists()) {
      // 1. Check if it's an initial admin
      if (ADMIN_EMAILS.includes(emailLower)) {
        try {
          await setDoc(userRef, {
            name: user.displayName || emailLower.split('@')[0],
            email: emailLower,
            role: 'admin',
            createdAt: serverTimestamp()
          });
          toast.success('Admin account initialized.');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      } else {
        // 2. Check if a record exists with this email
        try {
          const q = query(collection(db, 'users'), where('email', '==', emailLower));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            const existingRecord = querySnap.docs[0];
            const data = existingRecord.data();
            const targetRole = ADMIN_EMAILS.includes(emailLower) ? 'admin' : (data.role || 'staff');

            await setDoc(userRef, {
              ...data,
              role: targetRole,
              createdAt: data.createdAt || serverTimestamp()
            });
            
            if (existingRecord.id !== user.uid) {
              await deleteDoc(existingRecord.ref);
            }
            
            toast.success(targetRole === 'admin' ? 'Admin account linked.' : 'Staff account linked.');
          } else {
            toast.error('Account not authorized. Contact administrator.');
            await auth.signOut();
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
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await postLoginSequencing(credential.user);
    } catch (error: any) {
      console.error('Login error:', error);
      
      let message = 'Failed to login. Please try again.';
      if (error.code === 'auth/invalid-credential') {
        message = 'Incorrect email or password. If you haven\'t set a password yet, try signing in with Google with your registered email.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please try again later.';
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-black p-4 relative overflow-hidden transition-colors duration-500">
      {/* Background Watermark Layer (Theme Background + Logo Watermark) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-bg-black" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="opacity-[0.05] blur-[1px] w-[600px] h-[600px] md:w-[800px] md:h-[800px]">
            <img 
              src="/charthess_logo-1.png" 
              alt="" 
              className="w-full h-full object-contain grayscale"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 dark:bg-primary/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center pt-10 text-center">
          <div className="mb-8">
             <img 
              src="/charthess_logo-1.png" 
              alt="Charthess School of Fashion Logo" 
              className="w-[280px] h-auto drop-shadow-[0_0_40px_rgba(28,163,184,0.3)] transition-all animate-in fade-in zoom-in-95"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="glass-card p-8 md:p-10 z-20">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-gray ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
              <label className="text-xs font-semibold text-text-gray ml-1 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
              disabled={loading || isGoogleLoading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg-card px-4 text-text-gray font-bold tracking-widest">Or Continue With</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading || isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm uppercase tracking-wider hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
        </div>

        <p className="text-center text-text-gray text-[10px] uppercase tracking-widest font-bold">
          School Administrative Access Layer
        </p>
      </div>
    </div>
  );
}
