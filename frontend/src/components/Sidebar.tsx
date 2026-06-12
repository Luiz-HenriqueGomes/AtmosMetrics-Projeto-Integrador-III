// Componente Sidebar - Navegacao principal do dashboard
// Implementa menu lateral com links, tema e status da API
import { LayoutDashboard, Thermometer, MapPin, Satellite, Activity, Settings, Sun, Moon, Wind } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  apiStatus: 'online' | 'offline' | 'loading';
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'anomalias', label: 'Temperaturas Extremas', icon: Thermometer },
  { id: 'qualidade_ar', label: 'Qualidade do Ar', icon: Wind },
  { id: 'localidades', label: 'Localidades', icon: MapPin },
  { id: 'satelites', label: 'Satélites', icon: Satellite },
];

export default function Sidebar({ activePage, onNavigate, apiStatus, theme, toggleTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={18} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">AtmosMetrics</div>
          <div className="sidebar-logo-version">v2.0 · Global</div>
        </div>
      </div>

      {/* Navegação Principal */}
      <span className="sidebar-section-label">Navegação</span>
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`sidebar-link ${activePage === id ? 'active' : ''}`}
          onClick={() => onNavigate(id)}
        >
          <Icon size={16} className="sidebar-link-icon" />
          {label}
        </button>
      ))}

      <span className="sidebar-section-label">Sistema</span>
      <button
        className={`sidebar-link ${activePage === 'configuracoes' ? 'active' : ''}`}
        onClick={() => onNavigate('configuracoes')}
      >
        <Settings size={16} className="sidebar-link-icon" />
        Configurações
      </button>

      {/* Footer com Status da API e Tema */}
      <div className="sidebar-footer">
        {toggleTheme && (
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>Modo {theme === 'light' ? 'Escuro' : 'Claro'}</span>
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', marginTop: '1rem' }}>
          <div
            className="sidebar-status-dot"
            style={{ background: apiStatus === 'online' ? 'var(--green)' : apiStatus === 'offline' ? '#ef4444' : '#f59e0b' }}
          />
          <span className="sidebar-status-text">
            API {apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Conectando...'}
          </span>
        </div>
      </div>
    </aside>
  );
}
