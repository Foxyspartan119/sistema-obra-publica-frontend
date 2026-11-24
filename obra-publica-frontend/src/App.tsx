import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import {
  MisObrasPage,
  PORTFOLIO_OBRAS_MOCK,
  type ObraPortfolioItem,
} from './pages/MisObrasPage';
import { ObraInicioPage } from './pages/ObraInicioPage';
import { CatalogoPage } from './pages/CatalogoPage';
import { ProgramaPage } from './pages/ProgramaPage';
import { BitacoraPage } from './pages/BitacoraPage';
import { EstimacionesPage } from './pages/EstimacionesPage';
import { DocumentosCierrePage } from './pages/DocumentosCierrePage';
import { ReportesPage } from './pages/ReportesPage';
/*
import {
  BITACORA_ENTRIES,
  CATALOG_CONCEPTS,
  DOCUMENTOS_OBRA,
  ESTIMACIONES_LIST,
  OBRA_DETAIL_MOCK,
  WEEKLY_ACTIVITIES,
} from './mocks/obra.mock';
*/
const MainRouter: React.FC = () => {
  const { user/*, sessionExpired, loginAsRole*/ } = useAuth();
  const [section, setSection] = useState<string>('inicio');
  const [selectedObra, setSelectedObra] = useState<ObraPortfolioItem>(
    PORTFOLIO_OBRAS_MOCK[0]
  );

  if (!user) {
    return (
      <LoginPage
      onLoginSuccess={(role) => {
        setSection(role === 'ADMINISTRADOR' ? 'admin-usuarios' : 'inicio')
      }}
      />
    );
  }

  const renderPage = () => {
    if (user.rol === 'ADMINISTRADOR' || section.startsWith('admin-')) {
      return <AdminPage activeSubSection={section} />;
    }

    switch (section) {
      case 'mis-obras':
        return (
          <MisObrasPage
          selectedObraId={selectedObra.id}
          onSelectObra={(obra) => {
            setSelectedObra(obra);
            setSection('inicio');
          }}
          />
        );
      case 'catalogo':
        return <CatalogoPage />;
      case 'programa':
        return <ProgramaPage />;
      case 'bitacora':
        return <BitacoraPage />;
      case 'estimaciones':
        return <EstimacionesPage />;
      case 'cierre':
        return <DocumentosCierrePage />;
      case 'reportes':
        return <ReportesPage />;
      default:
        return <ObraInicioPage onNavigateSection={setSection} />;
    }
  };

  return (
    <AppLayout activeSection={section} onNavigate={setSection}>
      {renderPage()}
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
     /* <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            OBRA · Acceso al Sistema
          </h1>
          {sessionExpired && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              Sesión finalizada automáticamente tras 20 minutos de inactividad por seguridad.
            </div>
          )}
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
                className="w-full py-2 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium cursor-pointer"
              >
                Entrar como {rol}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderOperationalSection = () => {
    if (section === 'inicio') {
      return <ObraInicioPage onNavigateSection={setSection} />;
    }

    // Vistas principales dedicadas al seleccionar en el Sidebar
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {OBRA_DETAIL_MOCK.contrato} · Vista detallada
            </p>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white capitalize">
              {section === 'cierre' ? 'Documentos y Cierre' : section}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSection('inicio')}
            className="text-xs font-medium text-brand hover:underline cursor-pointer"
          >
            ← Volver a Inicio
          </button>
        </div>

        {section === 'catalogo' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-5">Clave</th>
                  <th className="py-3 px-3">Concepto</th>
                  <th className="py-3 px-3">Unidad</th>
                  <th className="py-3 px-3">Volumen</th>
                  <th className="py-3 px-3">Ejecutado</th>
                  <th className="py-3 px-5 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {CATALOG_CONCEPTS.map((c) => (
                  <tr key={c.clave}>
                    <td className="py-3.5 px-5 font-semibold text-brand">{c.clave}</td>
                    <td className="py-3.5 px-3 font-medium">{c.concepto}</td>
                    <td className="py-3.5 px-3 text-slate-500">{c.unidad}</td>
                    <td className="py-3.5 px-3 text-slate-500">{c.volumen}</td>
                    <td className="py-3.5 px-3">{c.ejecutado}</td>
                    <td className="py-3.5 px-5 text-right font-semibold">{c.importe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {section === 'programa' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
            {WEEKLY_ACTIVITIES.map((act) => (
              <div key={act.id} className="p-5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{act.title}</p>
                  <p className="text-slate-400 mt-0.5">
                    {act.subtitle} · Término: {act.endDate}
                  </p>
                </div>
                <span className="font-semibold text-brand">{act.progress}%</span>
              </div>
            ))}
          </div>
        )}

        {section === 'bitacora' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
            {BITACORA_ENTRIES.map((nota) => (
              <div key={nota.folio} className="p-5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-brand mr-2">{nota.folio}</span>
                  <span className="font-medium">{nota.asunto}</span>
                  <p className="text-slate-400 mt-0.5">
                    {nota.fecha} · {nota.autor}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                  {nota.estado}
                </span>
              </div>
            ))}
          </div>
        )}

        {section === 'estimaciones' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
            {ESTIMACIONES_LIST.map((est) => (
              <div key={est.numero} className="p-5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold">{est.numero}</p>
                  <p className="text-slate-400 mt-0.5">{est.periodo}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{est.monto}</span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                    {est.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {section === 'cierre' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
            {DOCUMENTOS_OBRA.map((doc) => (
              <div key={doc.nombre} className="p-5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold">{doc.nombre}</p>
                  <p className="text-slate-400 mt-0.5">
                    {doc.categoria} · {doc.fecha}
                  </p>
                </div>
                <span className="text-emerald-600 font-semibold">{doc.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout activeSection={section} onNavigate={setSection}>
      {user.rol === 'ADMINISTRADOR' || section.startsWith('admin-') ? (
        <AdminPage activeSubSection={section} />
      ) : (
        renderOperationalSection()
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
}*/