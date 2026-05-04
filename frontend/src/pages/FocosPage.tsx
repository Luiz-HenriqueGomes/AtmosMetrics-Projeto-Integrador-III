import { useEffect, useState } from 'react';
import { Flame, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { api, type AnomaliaItem, type AnomaliaFilters, type EstadoOut, type BiomaOut } from '../services/api';
import './FocosPage.css';

const PAGE_SIZE = 100;

export default function FocosPage() {
  const [data, setData] = useState<AnomaliaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filtros
  const [uf, setUf] = useState('');
  const [bioma, setBioma] = useState('');
  const [satelite, setSatelite] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Opções para selects
  const [estados, setEstados] = useState<EstadoOut[]>([]);
  const [biomas, setBiomas] = useState<BiomaOut[]>([]);

  // Carrega opções de filtro ao montar
  useEffect(() => {
    api.getEstados().then(setEstados).catch(() => {});
    api.getBiomas().then(setBiomas).catch(() => {});
  }, []);

  // Carrega dados quando filtros ou offset mudam
  useEffect(() => {
    setLoading(true);
    setError(null);

    const filters: AnomaliaFilters = {
      limit: PAGE_SIZE,
      offset,
      ...(uf && { uf }),
      ...(bioma && { bioma }),
      ...(satelite && { satelite }),
      ...(dataInicio && { data_inicio: dataInicio }),
      ...(dataFim && { data_fim: dataFim }),
    };

    api.getAnomalias(filters)
      .then(setData)
      .catch(() => setError('Não foi possível carregar os focos de calor.'))
      .finally(() => setLoading(false));
  }, [offset, uf, bioma, satelite, dataInicio, dataFim]);

  const handleFilter = () => {
    setOffset(0); // Reset para página 1 ao filtrar
  };

  const clearFilters = () => {
    setUf('');
    setBioma('');
    setSatelite('');
    setDataInicio('');
    setDataFim('');
    setOffset(0);
  };

  const hasActiveFilters = uf || bioma || satelite || dataInicio || dataFim;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="focos-page">
      {/* Header */}
      <div className="focos-header">
        <div>
          <h1 className="focos-title">Focos de Calor</h1>
          <p className="focos-subtitle">
            Registro detalhado de anomalias térmicas detectadas por satélite
          </p>
        </div>
        <button
          className={`focos-filter-toggle ${filtersOpen ? 'active' : ''}`}
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Filter size={14} />
          Filtros
          {hasActiveFilters && <span className="filter-badge" />}
        </button>
      </div>

      {/* Filtros */}
      {filtersOpen && (
        <div className="focos-filters panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Estado (UF)</label>
              <select className="filter-input" value={uf} onChange={e => { setUf(e.target.value); handleFilter(); }}>
                <option value="">Todos</option>
                {estados.map(e => (
                  <option key={e.uf} value={e.uf}>{e.uf} — {e.estado}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Bioma</label>
              <select className="filter-input" value={bioma} onChange={e => { setBioma(e.target.value); handleFilter(); }}>
                <option value="">Todos</option>
                {biomas.map(b => (
                  <option key={b.bioma} value={b.bioma}>{b.bioma}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Satélite</label>
              <input
                className="filter-input"
                type="text"
                placeholder="Ex: AQUA_M-T"
                value={satelite}
                onChange={e => setSatelite(e.target.value)}
                onBlur={handleFilter}
                onKeyDown={e => e.key === 'Enter' && handleFilter()}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Data Início</label>
              <input
                className="filter-input"
                type="date"
                value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); handleFilter(); }}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Data Fim</label>
              <input
                className="filter-input"
                type="date"
                value={dataFim}
                onChange={e => { setDataFim(e.target.value); handleFilter(); }}
              />
            </div>

            {hasActiveFilters && (
              <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="filter-clear" onClick={clearFilters}>
                  <X size={12} />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="error-banner">
          <Flame size={16} />
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="focos-table-wrap panel">
        <div className="focos-table-header">
          <span className="focos-table-count">
            {loading ? 'Carregando...' : `${data.length} registros exibidos`}
            {hasActiveFilters && ' (filtrado)'}
          </span>
          <span className="focos-table-page">Página {currentPage}</span>
        </div>

        <div className="focos-table-scroll">
          <table className="focos-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>UF</th>
                <th>Município</th>
                <th>Bioma</th>
                <th>Satélite</th>
                <th>Lat</th>
                <th>Lon</th>
                <th>FRP (MW)</th>
                <th>Risco</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j}><div className="skeleton-cell" /></td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="focos-empty">
                    <Flame size={20} />
                    <span>Nenhum foco encontrado. {hasActiveFilters ? 'Tente ajustar os filtros.' : 'Execute o ETL para popular o banco.'}</span>
                  </td>
                </tr>
              ) : (
                data.map(item => (
                  <tr key={item.id_anomalia}>
                    <td>{item.data_completa ?? '—'}</td>
                    <td>{item.hora_utc ?? '—'}</td>
                    <td><span className="uf-badge">{item.uf ?? '—'}</span></td>
                    <td>{item.municipio ?? '—'}</td>
                    <td>{item.bioma ?? '—'}</td>
                    <td className="td-satelite">{item.nome_satelite ?? '—'}</td>
                    <td className="td-num">{Number(item.latitude).toFixed(4)}</td>
                    <td className="td-num">{Number(item.longitude).toFixed(4)}</td>
                    <td className="td-num td-frp">{item.frp_megawatts ? Number(item.frp_megawatts).toFixed(1) : '—'}</td>
                    <td className="td-num">{item.risco_fogo ? Number(item.risco_fogo).toFixed(2) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {!loading && data.length > 0 && (
          <div className="focos-pagination">
            <button
              className="pagination-btn"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            <span className="pagination-info">Página {currentPage}</span>
            <button
              className="pagination-btn"
              disabled={data.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Próxima
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
