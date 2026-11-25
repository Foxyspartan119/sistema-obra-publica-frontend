import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ObraProvider, useObra } from './context/ObraContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { MisObrasPage } from './pages/MisObrasPage';
import { ObraInicioPage } from './pages/ObraInicioPage';
import { CatalogoPage } from './pages/CatalogoPage';
import { ProgramaPage } from './pages/ProgramaPage';
import { BitacoraPage } from './pages/BitacoraPage';
import { EstimacionesPage } from './pages/EstimacionesPage';
import { DocumentosCierrePage } from './pages/DocumentosCierrePage';
import { ReportesPage } from './pages/ReportesPage';

const MainRouter: React.FC = () => {
  const { user } = useAuth();
  const { selectedObra, selectObraById } = useObra();
  const [section, setSection] = useState<string>('inicio');

  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(role) =>
          setSection(role === 'ADMINISTRADOR' ? 'admin-usuarios' : 'inicio')
        }
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
              selectObraById(obra.id);
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
      case 'inicio':
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
      <ObraProvider>
        <MainRouter />
      </ObraProvider>
    </AuthProvider>
  );
}