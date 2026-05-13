import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { updateDoc } from 'firebase/firestore';
import { ADMIN_EMAILS } from '../lib/constants';

interface AuthContextType {
  user: User | null;
  userRole: 'admin' | 'staff' | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      if (user) {
        unsubDoc = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role);
            
            // Auto-promote if in ADMIN_EMAILS but listed as staff
            const emailLower = user.email?.toLowerCase();
            if (emailLower && ADMIN_EMAILS.includes(emailLower) && data.role !== 'admin') {
              updateDoc(userDoc.ref, { role: 'admin' }).catch(console.error);
            }
          } else {
            setUserRole(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Auth role error:", error);
          setUserRole(null);
          setLoading(false);
        });
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const isAdmin = userRole === 'admin' || (
    !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  );

  return (
    <AuthContext.Provider value={{ user, userRole, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
