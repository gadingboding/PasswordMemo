import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { PasswordManager } from 'password-memo-core';

interface PasswordManagerContextType {
  passwordManager: PasswordManager | null;
  masterPassword: string | null;
}

const PasswordManagerContext = createContext<PasswordManagerContextType | undefined>(undefined);

interface PasswordManagerProviderProps {
  children: ReactNode;
}

export function PasswordManagerProvider({ children }: PasswordManagerProviderProps) {
  const { passwordManager } = useAuthStore();
  // 注意：在实际应用中，应该安全地管理masterPassword
  // 这里仅为了满足接口需求，实际实现可能需要更安全的方式
  const [masterPassword, _] = React.useState<string | null>(null);

  return (
    <PasswordManagerContext.Provider value={{ passwordManager, masterPassword }}>
      {children}
    </PasswordManagerContext.Provider>
  );
}

export function usePasswordManager() {
  const context = useContext(PasswordManagerContext);
  if (context === undefined) {
    throw new Error('usePasswordManager must be used within a PasswordManagerProvider');
  }
  return context;
}