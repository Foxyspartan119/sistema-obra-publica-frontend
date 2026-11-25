import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserRole, UserSession } from '../types/obra.types';
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

/** Apariencia y contraste son ejes independientes: 2 x 2 = 4 modos. */
export type Appearance = 'claro' | 'oscuro';

interface A11yPrefs {
  appearance: Appearance;
  highContrast: boolean;
}

const A11Y_STORAGE_KEY = 'obra.a11y.v1';

const prefersMedia = (query: string): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;

/** Preferencia guardada; si no hay, respeta la del sistema operativo. */
function readInitialPrefs(): A11yPrefs {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<A11yPrefs>;
      if ((p.appearance === 'claro' || p.appearance === 'oscuro') && typeof p.highContrast === 'boolean') {
        return { appearance: p.appearance, highContrast: p.highContrast };
      }
    }
  } catch {
    // localStorage no disponible o JSON inválido: se usan los valores por defecto
  }
  return {
    appearance: prefersMedia('(prefers-color-scheme: dark)') ? 'oscuro' : 'claro',
    highContrast: prefersMedia('(prefers-contrast: more)'),
  };
}

// Eventos que cuentan como actividad (RNF-SEG-05). Incluye táctil: en tablets
// de campo no se disparan mousemove/keydown al desplazarse o tocar.
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;

interface AuthContextType {
  user: UserSession | null;
  sessionExpired: boolean;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  loginAsRole: (role: UserRole) => void;
  logout: (expired?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(MOCK_USERS_BY_ROLE.RESIDENTE);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(readInitialPrefs);
  const { appearance, highContrast } = prefs;

  // Aplica las clases al <html> y persiste la preferencia.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', appearance === 'oscuro');
    root.classList.toggle('high-contrast', highContrast);
    try {
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ appearance, highContrast }));
    } catch {
      // sin persistencia: el modo sigue funcionando en esta sesión
    }
  }, [appearance, highContrast]);

  const setAppearance = (next: Appearance) => setPrefs((p) => ({ ...p, appearance: next }));
  const setHighContrast = (next: boolean) => setPrefs((p) => ({ ...p, highContrast: next }));

  useEffect(() => {
    if (!user) return;
    let timer = setTimeout(() => logout(true), BUSINESS_CONSTANTS.SESSION_TIMEOUT_MS);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(true), BUSINESS_CONSTANTS.SESSION_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
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
      value={{
        user,
        sessionExpired,
        appearance,
        setAppearance,
        highContrast,
        setHighContrast,
        loginAsRole,
        logout,
      }}
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