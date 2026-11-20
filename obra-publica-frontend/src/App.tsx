import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { AdminPage } from './pages/AdminPage';

const MainRouter: React.FC = () => {
  const { user, sessionExpired, loginAsRole } = useAuth();
  const [section, setSection] = useState<string>('admin-usuarios');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            OBRA · Acceso al Sistema
          </h1>
          {sessionExpired && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              Sesión finalizada automáticamente tras 20 minutos de inactividad por seguridad.
            </div>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Selecciona un perfil institucional para entrar en modo prerenderizado:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {(
              ['ADMINISTRADOR', 'RESIDENTE', 'SUPERVISOR', 'SUPERINTENDENTE', 'DIRECTIVO'] as const
            ).map((rol) => (
              <button
                key={rol}
                type="button"
                onClick={() => {
                  loginAsRole(rol);
                  setSection(rol === 'ADMINISTRADOR' ? 'admin-usuarios' : 'inicio');
                }}
                className="w-full py-2 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Entrar como {rol}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout activeSection={section} onNavigate={setSection}>
      {user.rol === 'ADMINISTRADOR' || section.startsWith('admin-') ? (
        <AdminPage activeSubSection={section} />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold capitalize text-slate-900 dark:text-white">
            Vista activa: {section}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Operando como <strong>{user.rol}</strong> ({user.nombre}).
          </p>
        </div>
      )}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}