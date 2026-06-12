import { useEffect, useState, useMemo } from 'react';
import { MapPin, AlertCircle, Thermometer, ThermometerSun, Snowflake, Flame } from 'lucide-react';
import { MapContainer, TileLayer, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import StatCard from '../components/StatCard';
import { api, type ClimaItem, type ResumoClimaResponse, type ResumoResponse } from '../services/api';
import './DashboardPage.css';

// ============================================================
// Coordenadas dos Estados Brasileiros (capitais como referência)
// ============================================================
const ESTADOS_BRASIL: Record<string, { lat: number; lng: number; nome: string }> = {
  AC: { lat: -9.975, lng: -67.810, nome: 'Acre' },
  AL: { lat: -9.666, lng: -35.735, nome: 'Alagoas' },
  AM: { lat: -3.119, lng: -60.022, nome: 'Amazonas' },
  AP: { lat: 0.035, lng: -51.066, nome: 'Amapá' },
  BA: { lat: -12.971, lng: -38.511, nome: 'Bahia' },
  CE: { lat: -3.717, lng: -38.543, nome: 'Ceará' },
  DF: { lat: -15.800, lng: -47.864, nome: 'Distrito Federal' },
  ES: { lat: -20.315, lng: -40.313, nome: 'Espírito Santo' },
  GO: { lat: -16.686, lng: -49.265, nome: 'Goiás' },
  MA: { lat: -2.530, lng: -44.283, nome: 'Maranhão' },
  MG: { lat: -19.917, lng: -43.934, nome: 'Minas Gerais' },
  MS: { lat: -20.443, lng: -54.647, nome: 'Mato Grosso do Sul' },
  MT: { lat: -15.601, lng: -56.097, nome: 'Mato Grosso' },
  PA: { lat: -1.456, lng: -48.503, nome: 'Pará' },
  PB: { lat: -7.115, lng: -34.863, nome: 'Paraíba' },
  PE: { lat: -8.054, lng: -34.871, nome: 'Pernambuco' },
  PI: { lat: -5.089, lng: -42.802, nome: 'Piauí' },
  PR: { lat: -25.428, lng: -49.273, nome: 'Paraná' },
  RJ: { lat: -22.903, lng: -43.171, nome: 'Rio de Janeiro' },
  RN: { lat: -5.794, lng: -35.211, nome: 'Rio Grande do Norte' },
  RO: { lat: -8.762, lng: -63.904, nome: 'Rondônia' },
  RR: { lat: 2.820, lng: -60.673, nome: 'Roraima' },
  RS: { lat: -30.033, lng: -51.230, nome: 'Rio Grande do Sul' },
  SC: { lat: -27.597, lng: -48.549, nome: 'Santa Catarina' },
  SE: { lat: -10.911, lng: -37.072, nome: 'Sergipe' },
  SP: { lat: -23.551, lng: -46.633, nome: 'São Paulo' },
  TO: { lat: -10.184, lng: -48.334, nome: 'Tocantins' },
};

// Utilitário para formatar nomes (Title Case)
const formatName = (str: string | null) => {
  if (!str) return '';
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e'];
  return str.toLowerCase().split(' ').map((word, index) => {
    if (index > 0 && prepositions.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

// Componente auxiliar para controlar o mapa dinamicamente
const MapController = ({ center, zoom }: { center: [number, number] | null, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

// Cor de temperatura
const getTempColor = (temp: number) => {
  if (temp <= 20) return '#3b82f6';
  if (temp >= 28) return '#ef4444';
  return '#f59e0b';
};

// Cor de focos de calor por intensidade
const getFocosColor = (total: number) => {
  if (total >= 400) return '#dc2626';
  if (total >= 200) return '#ef4444';
  if (total >= 50) return '#f97316';
  return '#facc15';
};

export default function DashboardPage() {
  const [climaData, setClimaData] = useState<ClimaItem[]>([]);
  const [resumoClima, setResumoClima] = useState<ResumoClimaResponse | null>(null);
  const [resumoFocos, setResumoFocos] = useState<ResumoResponse | null>(null);
  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Carrega apenas os resumos e dados climáticos — NÃO carrega anomalias individuais
        const [extremas, clima, resumo] = await Promise.all([
          api.getClimaExtremas({ limit: 500 }),
          api.getResumoClima(),
          api.getResumo()
        ]);
        setClimaData(extremas);
        setResumoClima(clima);
        setResumoFocos(resumo);
      } catch {
        setError('Não foi possível carregar os dados. Execute o ETL ou verifique a API.');
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // ---- Dados por ESTADO (Brasil) usando o resumo ----
  const estadosFocos = useMemo(() => {
    if (!resumoFocos?.por_uf) return [];
    return resumoFocos.por_uf
      .filter(uf => ESTADOS_BRASIL[uf.chave])
      .map(uf => ({
        ...uf,
        ...ESTADOS_BRASIL[uf.chave],
      }));
  }, [resumoFocos]);

  // ---- Rankings (deduplicados por PAÍS — 1 entrada por país) ----
  const topEstadosFocos = useMemo(() => {
    return estadosFocos.slice(0, 10);
  }, [estadosFocos]);

  const topPaisesQuentes = useMemo(() => {
    const unique = new Map<string, ClimaItem>();
    climaData.forEach(item => {
      if (!item.pais || item.temperatura_max === null) return;
      if (!unique.has(item.pais) || Number(item.temperatura_max) > Number(unique.get(item.pais)!.temperatura_max)) {
        unique.set(item.pais, item);
      }
    });
    return Array.from(unique.values())
      .sort((a, b) => Number(b.temperatura_max) - Number(a.temperatura_max))
      .slice(0, 10);
  }, [climaData]);

  const topPaisesFrios = useMemo(() => {
    const unique = new Map<string, ClimaItem>();
    climaData.filter(a => a.pais !== 'Antártica').forEach(item => {
      if (!item.pais || item.temperatura_min === null) return;
      if (!unique.has(item.pais) || Number(item.temperatura_min) < Number(unique.get(item.pais)!.temperatura_min)) {
        unique.set(item.pais, item);
      }
    });
    return Array.from(unique.values())
      .sort((a, b) => Number(a.temperatura_min) - Number(b.temperatura_min))
      .slice(0, 10);
  }, [climaData]);

  const hottestCountry = topPaisesQuentes[0];
  const coldestCountry = topPaisesFrios[0];
  const totalPaises = useMemo(() => new Set(climaData.map(c => c.pais).filter(Boolean)).size, [climaData]);

  // ---- Marcadores do Mapa ----

  // Marcadores de ESTADOS (Brasil) — focos de calor agregados
  const estadoMarkers = useMemo(() => estadosFocos.map(estado => {
    const color = getFocosColor(estado.total_focos);
    const radius = Math.max(8, Math.min(24, estado.total_focos / 25));

    return (
      <CircleMarker
        key={`estado-${estado.chave}`}
        center={[estado.lat, estado.lng]}
        radius={radius}
        pathOptions={{
          color: '#ffffff',
          opacity: 0.5,
          fillColor: color,
          fillOpacity: 0.85,
          weight: 1.5
        }}
      >
        <Popup className="custom-popup">
          <div style={{ textAlign: 'center', minWidth: '140px' }}>
            <strong style={{ fontSize: '14px' }}>{estado.nome}</strong>
            <div style={{ fontSize: '11px', color: '#666' }}>{estado.chave}</div>
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              Focos de Calor: <b style={{ color: '#ef4444' }}>{estado.total_focos}</b><br/>
              FRP Média: {Number(estado.frp_media).toFixed(1)} MW<br/>
              FRP Máxima: {estado.frp_max} MW
            </div>
          </div>
        </Popup>
      </CircleMarker>
    );
  }), [estadosFocos]);

  // Marcadores de cidades/capitais no mundo — todos os pontos de clima (já são apenas locais principais)
  const climaMarkers = useMemo(() => climaData.map(item => {
    if (!item.latitude || !item.longitude) return null;
    const temp = Number(item.temperatura_media);
    const color = getTempColor(temp);
    const radius = Math.max(7, Math.min(16, Math.abs(temp - 20) / 2));

    return (
      <CircleMarker
        key={`clima-${item.id_clima}`}
        center={[parseFloat(item.latitude), parseFloat(item.longitude)]}
        radius={radius}
        pathOptions={{
          color: '#ffffff',
          opacity: 0.6,
          fillColor: color,
          fillOpacity: 0.85,
          weight: 1.5
        }}
      >
        <Popup className="custom-popup">
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <strong style={{ fontSize: '14px' }}>{formatName(item.pais)}</strong>
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              Temp: {item.temperatura_media}°C<br/>
              Mín/Máx: {item.temperatura_min}°C / {item.temperatura_max}°C<br/>
              Umidade: {item.umidade_media}%
            </div>
          </div>
        </Popup>
      </CircleMarker>
    );
  }), [climaData]);

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Monitoramento Global</h1>
          <p className="dashboard-subtitle">
            Focos de calor por estado (INPE) e clima por país (Open-Meteo)
          </p>
        </div>
        <div className="dashboard-badge">
          <span className="badge-dot" />
          Dados Ativos
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Focos de Calor (Brasil)"
          value={resumoFocos?.total_focos ?? 0}
          sub={`🔥 ${resumoFocos?.por_uf?.length ?? 0} estados afetados`}
          icon={Flame}
          accent="#ea580c"
          iconBg="rgba(234,88,12,0.12)"
          loading={loading}
        />
        <StatCard
          label="Países Monitorados"
          value={totalPaises}
          sub="🌍 Dados climáticos globais"
          icon={MapPin}
          accent="var(--accent)"
          iconBg="rgba(59,130,246,0.12)"
          loading={loading}
        />
        <StatCard
          label="Pico de Calor"
          value={hottestCountry ? `${hottestCountry.temperatura_max}°C` : '—'}
          sub={hottestCountry ? `🔥 ${formatName(hottestCountry.pais)}` : '—'}
          icon={ThermometerSun}
          accent="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          loading={loading}
        />
        <StatCard
          label="Pico de Frio"
          value={coldestCountry ? `${coldestCountry.temperatura_min}°C` : '—'}
          sub={coldestCountry ? `❄️ ${formatName(coldestCountry.pais)}` : '—'}
          icon={Snowflake}
          accent="#3b82f6"
          iconBg="rgba(59,130,246,0.12)"
          loading={loading}
        />
      </div>

      {/* Mapa — Estados do Brasil + Países do Mundo */}
      <div className="panel" style={{ height: '450px', padding: 0, overflow: 'hidden', position: 'relative' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Carregando mapa...
          </div>
        ) : (
          <>
            <div style={{
              position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '11px',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Legenda</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                Focos de Calor por Estado (Brasil)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                Clima por País (Mundo)
              </div>
            </div>

            <MapContainer
              preferCanvas={true}
              center={[-10, -50]}
              zoom={3.5}
              minZoom={2}
              style={{ height: '100%', width: '100%', zIndex: 0, background: '#1e293b' }}
            >
              <MapController center={mapFocus} zoom={6} />
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri'
                className="map-tiles-dark-overlay"
              />
              {estadoMarkers}
              {climaMarkers}
            </MapContainer>
          </>
        )}
      </div>

      {/* Rankings */}
      <div className="charts-grid">
        <div className="panel">
          <div className="panel-title" style={{ color: '#ea580c' }}>
            <Flame size={14} />
            Top Estados: Focos de Calor
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Carregando...</p>
          ) : topEstadosFocos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhum dado disponível.</p>
          ) : (
            <div className="rank-list">
              {topEstadosFocos.map((item, i) => (
                <div
                  className="rank-item"
                  key={item.chave}
                  onClick={() => {
                    const coords = ESTADOS_BRASIL[item.chave];
                    if (coords) setMapFocus([coords.lat, coords.lng]);
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Clique para ver no mapa"
                >
                  <span className="rank-pos">#{i + 1}</span>
                  <span className="rank-label">{ESTADOS_BRASIL[item.chave]?.nome ?? item.chave}</span>
                  <span className="rank-value" style={{ color: '#ea580c', fontWeight: 'bold' }}>
                    {item.total_focos} focos
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title" style={{ color: '#ef4444' }}>
            <ThermometerSun size={14} />
            Top Países: Mais Quentes
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Carregando...</p>
          ) : topPaisesQuentes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhum dado disponível.</p>
          ) : (
            <div className="rank-list">
              {topPaisesQuentes.map((item, i) => (
                <div
                  className="rank-item"
                  key={`hot-${item.pais}`}
                  onClick={() => {
                    if (item.latitude && item.longitude)
                      setMapFocus([parseFloat(item.latitude), parseFloat(item.longitude)]);
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Clique para ver no mapa"
                >
                  <span className="rank-pos">#{i + 1}</span>
                  <span className="rank-label">{formatName(item.pais)}</span>
                  <span className="rank-value" style={{ color: '#ef4444', fontWeight: 'bold' }}>
                    {item.temperatura_max}°C
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-title" style={{ color: '#3b82f6' }}>
            <Snowflake size={14} />
            Top Países: Mais Frios
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Carregando...</p>
          ) : topPaisesFrios.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Nenhum dado disponível.</p>
          ) : (
            <div className="rank-list">
              {topPaisesFrios.map((item, i) => (
                <div
                  className="rank-item"
                  key={`cold-${item.pais}`}
                  onClick={() => {
                    if (item.latitude && item.longitude)
                      setMapFocus([parseFloat(item.latitude), parseFloat(item.longitude)]);
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Clique para ver no mapa"
                >
                  <span className="rank-pos">#{i + 1}</span>
                  <span className="rank-label">{formatName(item.pais)}</span>
                  <span className="rank-value" style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                    {item.temperatura_min}°C
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
