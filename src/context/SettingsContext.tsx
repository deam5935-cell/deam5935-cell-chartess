import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_LOGO } from '../lib/constants';

interface AppSettings {
  logoUrl: string;
  schoolName: string;
  motto: string;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    logoUrl: DEFAULT_LOGO,
    schoolName: 'Charthess',
    motto: 'School of Fashion'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppSettings;
        // Migration: If it's an old default, update it to the new one
        if (
          data.logoUrl === '/charthess_logo-1.png' || 
          data.logoUrl === '/charthess_logo_new.png' ||
          data.logoUrl === '/charthess_logo_new_1.png'
        ) {
          updateSettings({ logoUrl: DEFAULT_LOGO });
        }
        setSettings(data);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    await setDoc(doc(db, 'settings', 'general'), {
      ...settings,
      ...newSettings
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
