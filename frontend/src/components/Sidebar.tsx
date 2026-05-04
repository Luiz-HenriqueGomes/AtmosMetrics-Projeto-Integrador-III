import { LayoutDashboard, Flame, MapPin, Satellite, Activity, Settings } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  apiStatus: 'online' | 'offline' | 'loading';
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'anomalias', label: 'Focos de Calor', icon: Flame },
  { id: 'localidades', label: 'Localidades', icon: MapPin },
  { id: 'satelites', label: 'Satélites', icon: Satellite },
];

export default function Sidebar({ activePage, onNavigate, apiStatus }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={18} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">AtmosMetrics</div>
          <div className="sidebar-logo-version">v1.0 · Dev Web II</div>
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

      {/* Footer com Status da API */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem' }}>
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
