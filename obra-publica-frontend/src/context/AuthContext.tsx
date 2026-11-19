import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AccessibilityTheme, UserRole, UserSession } from '../types/obra.types';
import { BUSINESS_CONSTANTS } from '../utils/businessRules';

const MOCK_USERS_BY_ROLE: Record<UserRole, UserSession> = {
  ADMINISTRADOR: {
    id: 1,
    nombre: 'Ana Solís',
    correo: 'ana.solis@obra.gob.mx',
    rol: 'ADMINISTRADOR',
    area: 'Administración',
    obrasAsignadas: [],
  },
  RESIDENTE: {
    id: 4,
    nombre: 'Ing. Marco Torres',
    correo: 'marco.torres@obra.gob.mx',
    rol: 'RESIDENTE',
    area: 'Residencia',
    obrasAsignadas: ['OP-2024-001'],
  },
  SUPERVISOR: {
    id: 3,
    nombre: 'Ing. Lucía Ramírez',
    correo: 'lucia.ramirez@obra.gob.mx',
    rol: 'SUPERVISOR',
    area: 'Supervisión',
    obrasAsignadas: ['OP-2024-001'],
  },
  SUPERINTENDENTE: {
    id: 2,
    nombre: 'Ing. Javier Mendoza',
    correo: 'javier.mendoza@obra.gob.mx',
    rol: 'SUPERINTENDENTE',
    area: 'Constructora del Norte, S.A. de C.V.',
    obrasAsignadas: ['OP-2024-001'],
  },
  DIRECTIVO: {
    id: 6,
    nombre: 'Ing. Carlos López',
    correo: 'carlos.lopez@obra.gob.mx',
    rol: 'DIRECTIVO',
    area: 'Dirección de Obras',
    obrasAsignadas: [],
  },
};

interface AuthContextType {
  user: UserSession | null;
  sessionExpired: boolean;
  theme: AccessibilityTheme;
  setTheme: (theme: AccessibilityTheme) => void;
  loginAsRole: (role: UserRole) => void;
  logout: (expired?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(MOCK_USERS_BY_ROLE.RESIDENTE);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [theme, setTheme] = useState<AccessibilityTheme>('claro');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (theme === 'oscuro') root.classList.add('dark');
    if (theme === 'alto-contraste') root.classList.add('high-contrast');
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    let timer = setTimeout(() => logout(true), BUSINESS_CONSTANTS.SESSION_TIMEOUT_MS);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(true), BUSINESS_CONSTANTS.SESSION_TIMEOUT_MS);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [user]);

  const loginAsRole = (role: UserRole) => {
    setSessionExpired(false);
    setUser(MOCK_USERS_BY_ROLE[role]);
  };

  const logout = (expired = false) => {
    setSessionExpired(expired);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, sessionExpired, theme, setTheme, loginAsRole, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};