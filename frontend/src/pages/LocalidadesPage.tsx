import { useEffect, useState } from 'react';
import { MapPin, Search, Globe } from 'lucide-react';
import { api, type Localidade, type EstadoOut } from '../services/api';
import './LocalidadesPage.css';

const REGIOES = ['Todas', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const regionColors: Record<string, string> = {
  Norte:          '#10b981',
  Nordeste:       '#f97316',
  'Centro-Oeste': '#3b82f6',
  Sudeste:        '#a78bfa',
  Sul:            '#06b6d4',
};

export default function LocalidadesPage() {
  const [estados, setEstados] = useState<EstadoOut[]>([]);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [regiaoFiltro, setRegiaoFiltro] = useState('Todas');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getEstados(), api.getLocalidades()])
      .then(([est, loc]) => {
        setEstados(est);
        setLocalidades(loc);
      })
      .catch(() => setError('Não foi possível carregar as localidades.'))
      .finally(() => setLoading(false));
  }, []);

  // Conta localidades por UF
  const contagemPorUF = localidades.reduce<Record<string, number>>((acc, l) => {
    acc[l.uf] = (acc[l.uf] || 0) + 1;
    return acc;
  }, {});

  // Biomas únicos por UF
  const biomasPorUF = localidades.reduce<Record<string, Set<string>>>((acc, l) => {
    if (!acc[l.uf]) acc[l.uf] = new Set();
    acc[l.uf].add(l.bioma);
    return acc;
  }, {});

  // Filtragem
  const estadosFiltrados = estados
    .filter(e => regiaoFiltro === 'Todas' || e.regiao === regiaoFiltro)
    .filter(e =>
      busca === '' ||
      e.estado.toLowerCase().includes(busca.toLowerCase()) ||
      e.uf.toLowerCase().includes(busca.toLowerCase())
    );

  return (
    <div className="localidades-page">
      {/* Header */}
      <div className="loc-header">
        <div>
          <h1 className="loc-title">Localidades</h1>
          <p className="loc-subtitle">
            <Globe size={13} style={{ verticalAlign: '-2px' }} />{' '}
            Estados e regiões monitorados pelo sistema — {estados.length} estados · {localidades.length} localidades
          </p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="loc-toolbar panel">
        <div className="loc-search-wrap">
          <Search size={14} className="loc-search-icon" />
          <input
            className="loc-search"
            type="text"
            placeholder="Buscar estado..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <div className="loc-region-tabs">
          {REGIOES.map(r => (
            <button
              key={r}
              className={`region-tab ${regiaoFiltro === r ? 'active' : ''}`}
              onClick={() => setRegiaoFiltro(r)}
              style={regiaoFiltro === r && r !== 'Todas' ? { borderColor: regionColors[r], color: regionColors[r] } : {}}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="error-banner">
          <MapPin size={16} />
          {error}
        </div>
      )}

      {/* Grid de cards */}
      {loading ? (
        <div className="loc-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="loc-card skeleton-card">
              <div className="skeleton-cell" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
              <div className="skeleton-cell" style={{ width: '70%', height: '16px' }} />
              <div className="skeleton-cell" style={{ width: '50%', height: '12px' }} />
            </div>
          ))}
        </div>
      ) : estadosFiltrados.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Nenhum estado encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="loc-grid">
          {estadosFiltrados.map(e => {
            const cor = regionColors[e.regiao] || '#94a3b8';
            const numLocalidades = contagemPorUF[e.uf] || 0;
            const biomasDoEstado = biomasPorUF[e.uf] ? Array.from(biomasPorUF[e.uf]) : [];

            return (
              <div
                key={e.uf}
                className="loc-card"
                style={{ '--card-accent': cor, '--card-glow': `radial-gradient(circle at top left, ${cor}11, transparent 60%)` } as React.CSSProperties}
              >
                <div className="loc-card-bar" style={{ background: cor }} />
                <div className="loc-card-top">
                  <div className="loc-uf-badge" style={{ background: `${cor}18`, color: cor }}>
                    {e.uf}
                  </div>
                  <span className="loc-region-tag" style={{ color: cor }}>{e.regiao}</span>
                </div>
                <h3 className="loc-card-name">{e.estado}</h3>
                <div className="loc-card-meta">
                  <span><MapPin size={11} /> {numLocalidades} localidades</span>
                </div>
                {biomasDoEstado.length > 0 && (
                  <div className="loc-card-biomas">
                    {biomasDoEstado.map(b => (
                      <span key={b} className="bioma-tag">{b}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
