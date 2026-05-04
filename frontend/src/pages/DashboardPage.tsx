import { useEffect, useState } from 'react';
import { Flame, MapPin, Satellite, BarChart3, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import StatCard from '../components/StatCard';
import { api, type ResumoResponse } from '../services/api';
import './DashboardPage.css';

// ---- Tooltip customizado para o Recharts ----
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(13,20,34,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '0.6rem 1rem',
        fontSize: '12px',
        color: '#f1f5f9',
      }}>
        <p style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontWeight: 700, color: '#f97316' }}>
          {payload[0].value?.toLocaleString('pt-BR')} focos
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getResumo()
      .then(setResumo)
      .catch(() => setError('Não foi possível carregar os dados. Verifique se o backend está online.'))
      .finally(() => setLoading(false));
  }, []);

  // Deriva os dados para os cards e gráficos a partir da estrutura real da API
  const porUF    = resumo?.por_uf    ?? [];
  const porBioma = resumo?.por_bioma ?? [];

  const estadosAfetados  = porUF.length;
  const biomaMaisAfetado = porBioma[0]?.chave ?? '—';

  // Formata para o Recharts
  const dadosBioma = porBioma.map(b => ({ bioma: b.chave, total: b.total_focos }));
  const topUF      = porUF.slice(0, 7);
  const maxUF      = topUF[0]?.total_focos ?? 1;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Monitoramento Nacional</h1>
          <p className="dashboard-subtitle">
            Focos de calor detectados por satélites — Fonte: INPE / Programa Queimadas
          </p>
        </div>
        <div className="dashboard-badge">
          <span className="badge-dot" />
          Dados INPE em tempo real
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total de Focos"
          value={resumo?.total_focos ?? 0}
          sub="🔥 Todos os registros no banco de dados"
          icon={Flame}
          accent="var(--fire)"
          iconBg="rgba(249,115,22,0.12)"
          loading={loading}
        />
        <StatCard
          label="Estados Afetados"
          value={estadosAfetados}
          sub={`📍 de 27 Unidades Federativas`}
          icon={MapPin}
          accent="var(--accent)"
          iconBg="rgba(59,130,246,0.12)"
          loading={loading}
        />
        <StatCard
          label="Bioma + Afetado"
          value={biomaMaisAfetado}
          sub={`🌿 ${porBioma[0]?.total_focos?.toLocaleString('pt-BR') ?? '—'} focos registrados`}
          icon={BarChart3}
          accent="var(--green)"
          iconBg="rgba(16,185,129,0.12)"
          loading={loading}
        />
        <StatCard
          label="FRP Médio"
          value={resumo?.media_frp ? `${parseFloat(resumo.media_frp).toFixed(1)} MW` : '—'}
          sub="🛰️ Potência Radiativa do Fogo"
          icon={Satellite}
          accent="#a78bfa"
          iconBg="rgba(167,139,250,0.12)"
          loading={loading}
        />
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Gráfico de barras — focos por bioma */}
        <div className="panel">
          <div className="panel-title">
            <BarChart3 size={14} />
            Focos por Bioma
          </div>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Carregando dados...
            </div>
          ) : dadosBioma.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Execute o ETL para popular o banco com dados do INPE
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dadosBioma} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="bioma" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {dadosBioma.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#f97316' : `rgba(249,115,22,${Math.max(0.3, 0.8 - i * 0.12)})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico de barras — top estados */}
        <div className="panel">
          <div className="panel-title">
            <BarChart3 size={14} />
            Top Estados (Focos)
          </div>
          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Carregando dados...
            </div>
          ) : topUF.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Execute o ETL para popular o banco com dados do INPE
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topUF} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="chave" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_focos" radius={[0, 4, 4, 0]}>
                  {topUF.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#3b82f6' : `rgba(59,130,246,${Math.max(0.3, 0.9 - i * 0.1)})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Ranking de Estados */}
      <div className="panel">
        <div className="panel-title">
          <Flame size={14} />
          Ranking Completo por Estado
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Carregando...</p>
        ) : topUF.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Nenhum dado disponível. Execute o ETL primeiro.
          </p>
        ) : (
          <div className="rank-list">
            {topUF.map((item, i) => (
              <div className="rank-item" key={item.chave}>
                <span className="rank-pos">#{i + 1}</span>
                <span className="rank-label">{item.chave}</span>
                <div className="rank-bar-wrap">
                  <div
                    className="rank-bar-fill"
                    style={{ width: `${(item.total_focos / maxUF) * 100}%` }}
                  />
                </div>
                <span className="rank-value">{item.total_focos.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
