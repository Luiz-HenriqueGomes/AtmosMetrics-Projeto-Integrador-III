import { useEffect, useState } from 'react';
import { Satellite, Radio, AlertCircle } from 'lucide-react';
import { api, type Satelite as SateliteType } from '../services/api';
import './SatelitesPage.css';

const agencyColors: Record<string, string> = {
  'NASA':     '#3b82f6',
  'NOAA':     '#10b981',
  'INPE':     '#f97316',
  'EUMETSAT': '#a78bfa',
  'JAXA':     '#06b6d4',
};

function getAgencyColor(agencia: string | null): string {
  if (!agencia) return '#94a3b8';
  for (const [key, color] of Object.entries(agencyColors)) {
    if (agencia.toUpperCase().includes(key)) return color;
  }
  return '#94a3b8';
}

export default function SatelitesPage() {
  const [satelites, setSatelites] = useState<SateliteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSatelites()
      .then(setSatelites)
      .catch(() => setError('Não foi possível carregar os satélites.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="satelites-page">
      {/* Header */}
      <div className="sat-header">
        <div>
          <h1 className="sat-title">Satélites</h1>
          <p className="sat-subtitle">
            <Radio size={13} style={{ verticalAlign: '-2px' }} />{' '}
            Constelação de satélites do INPE utilizados na detecção de focos de calor —{' '}
            {satelites.length} satélites cadastrados
          </p>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="sat-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="sat-card skeleton-card">
              <div className="skeleton-cell" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
              <div className="skeleton-cell" style={{ width: '70%', height: '18px' }} />
              <div className="skeleton-cell" style={{ width: '40%', height: '12px' }} />
              <div className="skeleton-cell" style={{ width: '90%', height: '12px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="sat-grid">
          {satelites.map((sat, index) => {
            const cor = getAgencyColor(sat.agencia);
            return (
              <div
                key={sat.id_satelite}
                className="sat-card"
                style={{
                  '--card-accent': cor,
                  '--card-glow': `radial-gradient(circle at top right, ${cor}11, transparent 60%)`,
                  animationDelay: `${index * 60}ms`,
                } as React.CSSProperties}
              >
                <div className="sat-card-bar" style={{ background: cor }} />
                <div className="sat-card-icon-wrap" style={{ background: `${cor}15`, color: cor }}>
                  <Satellite size={22} className="sat-icon-spin" />
                </div>
                <h3 className="sat-card-name">{sat.nome_satelite}</h3>
                {sat.agencia && (
                  <span className="sat-agency" style={{ color: cor }}>
                    {sat.agencia}
                  </span>
                )}
                <p className="sat-card-desc">
                  {sat.descricao || 'Satélite utilizado na detecção de anomalias térmicas via sensoriamento remoto.'}
                </p>
                <div className="sat-card-id">
                  ID #{sat.id_satelite}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
