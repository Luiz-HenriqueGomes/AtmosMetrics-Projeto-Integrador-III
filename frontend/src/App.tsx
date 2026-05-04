import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import FocosPage from './pages/FocosPage';
import LocalidadesPage from './pages/LocalidadesPage';
import SatelitesPage from './pages/SatelitesPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import { api } from './services/api';
import './App.css';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'loading'>('loading');

  // Verifica o status da API ao iniciar
  useEffect(() => {
    api.getHealth()
      .then(data => setApiStatus(data.banco === 'conectado' ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'));
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':     return <DashboardPage />;
      case 'anomalias':     return <FocosPage />;
      case 'localidades':   return <LocalidadesPage />;
      case 'satelites':     return <SatelitesPage />;
      case 'configuracoes': return <ConfiguracoesPage />;
      default:
        return (
          <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
            <p>🚧 Página "<strong>{activePage}</strong>" em construção.</p>
          </div>
        );
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        apiStatus={apiStatus}
      />
      <main className="app-main">
        {renderPage()}
      </main>
    </div>
  );
}

