import { useEffect, useState, useMemo } from 'react';
import { Wind, Activity, CheckCircle, AlertOctagon, X, Info } from 'lucide-react';
import { MapContainer, TileLayer, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
// @ts-ignore
import 'leaflet-velocity';
import { api, type QualidadeArItem, type PaisOut, type ContinenteOut } from '../services/api';
import './QualidadeArPage.css';

// Componente para desenhar as linhas de vento do GFS no Leaflet
function WindVelocityLayer() {
  const map = useMap();

  useEffect(() => {
    let velocityLayer: any = null;

    fetch('/wind-gfs.json')
      .then(res => res.json())
      .then(data => {
        // Inicializa o layer de vento
        velocityLayer = (L as any).velocityLayer({
          displayValues: false,
          displayOptions: {
            velocityType: 'Global Wind',
            displayPosition: 'bottomleft',
            displayEmptyString: 'No wind data'
          },
          data: data,
          maxVelocity: 15,
          colorScale: ["#ffffff88"] // Partículas translúcidas
        });

        velocityLayer.addTo(map);
      })
      .catch(err => console.error('Erro ao carregar dados de vento:', err));

    return () => {
      if (velocityLayer && map.hasLayer(velocityLayer)) {
        map.removeLayer(velocityLayer);
      }
    };
  }, [map]);

  return null;
}

const PAGE_SIZE = 1000;

const formatLocationName = (str: string | null) => {
  if (!str) return '';
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e'];
  return str.toLowerCase().split(' ').map((word, index) => {
    if (index > 0 && prepositions.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

// Padrão EPA de AQI (0 a 500)
const getAqiStatus = (aqi: number) => {
  if (aqi <= 50) return { class: 'good', label: 'Bom', color: '#10b981' };
  if (aqi <= 100) return { class: 'moderate', label: 'Moderado', color: '#facc15' };
  if (aqi <= 150) return { class: 'sensitive', label: 'Insalubre p/ Sensíveis', color: '#f97316' };
  if (aqi <= 200) return { class: 'unhealthy', label: 'Insalubre', color: '#ef4444' };
  if (aqi <= 300) return { class: 'very', label: 'Muito Insalubre', color: '#8b5cf6' };
  return { class: 'hazardous', label: 'Perigoso', color: '#9f1239' };
};

export default function QualidadeArPage() {
  const [data, setData] = useState<QualidadeArItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Resumo
  const [globalMediaAqi, setGlobalMediaAqi] = useState<number | null>(null);

  // Filtros
  const [paises, setPaises] = useState<PaisOut[]>([]);
  const [continentes, setContinentes] = useState<ContinenteOut[]>([]);
  
  const [pais, setPais] = useState('');
  const [continente, setContinente] = useState('');

  const hasActiveFilters = Boolean(pais || continente);

  const carregarFiltros = async () => {
    try {
      const [p, c] = await Promise.all([
        api.getPaises(),
        api.getContinentes()
      ]);
      setPaises(p);
      setContinentes(c);
    } catch (err) {
      console.error('Erro ao carregar filtros:', err);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      // 1. Busca resumo global
      const resumo = await api.getResumoQualidadeAr();
      setGlobalMediaAqi(Number(resumo.aqi_medio) || null);

      // 2. Busca lista detalhada
      const response = await api.getQualidadeAr({
        pais,
        continente,
        limit: PAGE_SIZE,
        offset: 0
      });
      setData(response);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFiltros();
  }, []);

  useEffect(() => {
    carregarDados();
  }, [pais, continente]);

  const limparFiltros = () => {
    setPais('');
    setContinente('');
  };

  // Processamento de dados
  const { groupedData, worstCity, bestCity } = useMemo(() => {
    const grouped: Record<string, QualidadeArItem[]> = {};
    let worst = null as QualidadeArItem | null;
    let best = null as QualidadeArItem | null;

    data.forEach(item => {
      const p = item.pais || 'Desconhecido';
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push(item);

      const aqi = Number(item.aqi) || 0;
      if (aqi > 0) {
        if (!worst || aqi > (Number(worst.aqi) || 0)) worst = item;
        if (!best || aqi < (Number(best.aqi) || 500)) best = item;
      }
    });

    return { groupedData: grouped, worstCity: worst, bestCity: best };
  }, [data]);

  // Memoiza os marcadores do mapa FORA do JSX (regra de hooks)
  const mapMarkers = useMemo(() => data.map(item => {
    if (!item.latitude || !item.longitude || !item.aqi) return null;
    const status = getAqiStatus(item.aqi);
    const radius = Math.max(8, (item.aqi / 500) * 25);
    
    return (
      <CircleMarker
        key={`map-${item.id_qualidade_ar}`}
        center={[Number(item.latitude), Number(item.longitude)]}
        radius={radius}
        pathOptions={{ 
          color: status.color, 
          fillColor: status.color, 
          weight: 2, 
          opacity: 0.9, 
          fillOpacity: 0.7 
        }}
      >
        <Popup>
          <div style={{ color: '#000', fontFamily: 'Inter, sans-serif' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{formatLocationName(item.municipio)}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{item.pais}</p>
            <div style={{ marginTop: '8px', padding: '6px', background: status.color, color: '#fff', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
              AQI: {item.aqi} - {status.label}
            </div>
            {item.pm2_5 && <p style={{ margin: '6px 0 0 0', fontSize: '11px' }}>PM2.5: {item.pm2_5} μg/m³</p>}
          </div>
        </Popup>
      </CircleMarker>
    );
  }), [data]);

  return (
    <div className="aqi-container">
      {/* Cabeçalho */}
      <div className="aqi-header">
        <div className="aqi-title-section">
          <h1><Wind size={28} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Qualidade do Ar</h1>
          <p>Monitoramento Global de AQI, PM2.5, PM10 e Poluentes Atmosféricos</p>
        </div>

        <div className="aqi-filters">
          <div className="aqi-filter-group">
            <label>Continente</label>
            <select value={continente} onChange={(e) => setContinente(e.target.value)}>
              <option value="">Todos</option>
              {continentes.map(c => <option key={c.continente} value={c.continente}>{c.continente}</option>)}
            </select>
          </div>
          <div className="aqi-filter-group">
            <label>País</label>
            <select value={pais} onChange={(e) => setPais(e.target.value)}>
              <option value="">Todos</option>
              {paises.map(p => <option key={p.pais} value={p.pais}>{p.pais}</option>)}
            </select>
          </div>

          {hasActiveFilters && (
            <button className="btn-filter" onClick={limparFiltros} title="Limpar Filtros">
              <X size={16} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Cartões de Resumo / KPI */}
      <div className="aqi-kpi-row">
        <div className="aqi-kpi-card">
          <div className="kpi-icon-wrap icon-global">
            <Activity size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">AQI Médio Global</span>
            <span className="kpi-value">
              {globalMediaAqi !== null ? globalMediaAqi.toFixed(1) : '--'}
            </span>
            <span className="kpi-desc">Índice geral da região filtrada</span>
          </div>
        </div>

        <div className="aqi-kpi-card" style={{ borderColor: worstCity ? getAqiStatus(Number(worstCity.aqi)).color : '' }}>
          <div className="kpi-icon-wrap icon-worst">
            <AlertOctagon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Pior Qualidade do Ar</span>
            <span className="kpi-value">
              {worstCity ? `${worstCity.aqi} AQI` : '--'}
            </span>
            <span className="kpi-desc">
              {worstCity ? `${formatLocationName(worstCity.municipio)} (${worstCity.pais})` : 'Aguardando dados...'}
            </span>
          </div>
        </div>

        <div className="aqi-kpi-card" style={{ borderColor: bestCity ? getAqiStatus(Number(bestCity.aqi)).color : '' }}>
          <div className="kpi-icon-wrap icon-best">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Melhor Qualidade do Ar</span>
            <span className="kpi-value">
              {bestCity ? `${bestCity.aqi} AQI` : '--'}
            </span>
            <span className="kpi-desc">
              {bestCity ? `${formatLocationName(bestCity.municipio)} (${bestCity.pais})` : 'Aguardando dados...'}
            </span>
          </div>
        </div>
      </div>

      {/* Layout Principal: Mapa + Sidebar Explicativa */}
      <div className="aqi-content-row">
        {/* Mapa Global da NASA / EPA Style */}
        <div className="aqi-map-container">

          {/* Dicionário/Legenda (IQAir Style) */}
          <div className="aqi-map-legend">
            <div className="legend-item bg-aqi-good">0-50 Bom</div>
            <div className="legend-item bg-aqi-moderate">51-100 Moderado</div>
            <div className="legend-item bg-aqi-sensitive">101-150 Sensíveis</div>
            <div className="legend-item bg-aqi-unhealthy">151-200 Insalubre</div>
            <div className="legend-item bg-aqi-very">201-300 Muito Insalubre</div>
            <div className="legend-item bg-aqi-hazardous">300+ Perigoso</div>
          </div>

          <MapContainer center={[15, 0]} zoom={2} minZoom={2} preferCanvas={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <WindVelocityLayer />
            
            {mapMarkers}
          </MapContainer>
        </div>

        {/* Sidebar de Informações */}
        <div className="aqi-info-sidebar">
          <div className="aqi-info-title">
            <Info size={18} /> O que significam esses dados?
          </div>
          
          <div className="aqi-info-block">
            <h4>AQI (Air Quality Index)</h4>
            <p>O Índice de Qualidade do Ar é um padrão universal. Ele converte poluentes complexos em um único número (0 a 500) para informar o grau de insalubridade e risco à saúde pública.</p>
          </div>

          <div className="aqi-info-block color-pm25">
            <h4>PM2.5 (Material Particulado Fino)</h4>
            <p>Partículas com menos de 2.5 micrômetros (fumaça de queimadas e fuligem). São extremamente perigosas pois penetram profundamente nos pulmões e na corrente sanguínea.</p>
          </div>

          <div className="aqi-info-block color-pm10">
            <h4>PM10 (Material Particulado)</h4>
            <p>Partículas maiores como poeira, pólen e cinzas vulcânicas. Causam irritações respiratórias e oculares, principalmente em épocas secas.</p>
          </div>

          <div className="aqi-info-block color-co">
            <h4>CO (Monóxido de Carbono)</h4>
            <p>Gás tóxico inodoro gerado pela queima incompleta (motores e incêndios florestais). Reduz a oxigenação do sangue, podendo causar asfixia em concentrações severas.</p>
          </div>

          <div className="aqi-info-block color-o3">
            <h4>O3 (Ozônio Troposférico)</h4>
            <p>Diferente da camada de ozônio (que nos protege), o ozônio ao nível do solo é um poluente tóxico formado pela reação da luz solar com outros gases poluentes.</p>
          </div>
        </div>
      </div>

      {/* Bento Grid Ranking */}
      <div className="aqi-bento-grid">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            Carregando dados globais...
          </div>
        ) : data.length === 0 ? (
          <div className="focos-empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
            <Wind size={24} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.5 }} />
            <span>Nenhum registro de ar encontrado com os filtros atuais.</span>
          </div>
        ) : (
          Object.entries(groupedData)
            .sort((a, b) => {
              // Ordena pelos países com piores AQI médios (ou seja, países mais poluídos primeiro)
              const maxAqiA = Math.max(...a[1].map(i => Number(i.aqi) || 0));
              const maxAqiB = Math.max(...b[1].map(i => Number(i.aqi) || 0));
              return maxAqiB - maxAqiA;
            })
            .map(([country, items]) => {
              // Deduplicar estações na mesma cidade mantendo a com o Pior AQI
              const uniqueItemsMap = new Map();
              for (const item of items) {
                const cityName = (item.pais === 'Brasil' && !item.municipio?.startsWith('Grid')) 
                  ? formatLocationName(item.municipio) 
                  : formatLocationName(item.pais);
                
                if (uniqueItemsMap.has(cityName)) {
                  const existing = uniqueItemsMap.get(cityName);
                  const existingAqi = Number(existing.aqi) || 0;
                  const itemAqi = Number(item.aqi) || 0;
                  
                  if (itemAqi > existingAqi) {
                    uniqueItemsMap.set(cityName, { ...item, cityName });
                  }
                } else {
                  uniqueItemsMap.set(cityName, { ...item, cityName });
                }
              }
              const uniqueItems = Array.from(uniqueItemsMap.values());
              
              // Define o tema do card do país pela sua pior cidade
              const worstInCountry = Math.max(...uniqueItems.map(i => Number(i.aqi) || 0));
              const themeStatus = getAqiStatus(worstInCountry);

              return (
                <div key={country} className={`aqi-bento-card theme-aqi-${themeStatus.class}`}>
                  <div className="aqi-bento-card-header">
                    <h3 className="aqi-bento-country">{country}</h3>
                    <span className="aqi-bento-badge">{uniqueItems.length} locais</span>
                  </div>
                  <div className="aqi-bento-card-body">
                    {uniqueItems
                      .sort((a, b) => (Number(b.aqi) || 0) - (Number(a.aqi) || 0))
                      .map(item => {
                        const aqi = Number(item.aqi) || 0;
                        const status = getAqiStatus(aqi);
                        const cityName = item.cityName;

                        // Range de 0 a 500 para a barra
                        let pct = (aqi / 500) * 100;
                        if (pct > 100) pct = 100;

                        return (
                          <div key={item.id_qualidade_ar} className="aqi-city-item">
                            <div className="aqi-city-info">
                              <span className="aqi-city-name" title={cityName}>{cityName}</span>
                              <span className={`aqi-val aqi-${status.class}`}>
                                {aqi} <span className={`aqi-label bg-aqi-${status.class}`}>{status.label}</span>
                              </span>
                            </div>
                            <div className="aqi-bar-bg">
                              <div 
                                className={`aqi-bar-fill fill-aqi-${status.class}`} 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                            <div className="aqi-city-details">
                              {item.pm2_5 && <span>PM2.5: {item.pm2_5}</span>}
                              {item.pm10 && <span>PM10: {item.pm10}</span>}
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </div>
              );
          })
        )}
      </div>
    </div>
  );
}
