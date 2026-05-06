import { useState, useEffect } from 'react';
import { Settings, Play, Loader2, CheckCircle2, XCircle, Server, Database, Globe, Calendar, AlertCircle } from 'lucide-react';
import { api, type HealthResponse, type ETLResponse } from '../services/api';
import './ConfiguracoesPage.css';

type ETLStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ConfiguracoesPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // ETL
  const [etlDate, setEtlDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [etlStatus, setEtlStatus] = useState<ETLStatus>('idle');
  const [etlResult, setEtlResult] = useState<ETLResponse | null>(null);
  const [etlError, setEtlError] = useState<string | null>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setHealthLoading(false));
  }, []);

  const handleETL = async () => {
    setEtlStatus('loading');
    setEtlResult(null);
    setEtlError(null);

    try {
      const result = await api.executarETL(etlDate);
      setEtlResult(result);
      setEtlStatus('success');
    } catch (err: any) {
      setEtlError(err.message || 'Erro desconhecido ao executar o ETL.');
      setEtlStatus('error');
    }
  };

  const dbOk = health?.banco === 'conectado';

  return (
    <div className="config-page">
      {/* Header */}
      <div className="config-header">
        <div>
          <h1 className="config-title">Configurações</h1>
          <p className="config-subtitle">
            <Settings size={13} style={{ verticalAlign: '-2px' }} />{' '}
            Painel de controle do sistema AtmosMetrics
          </p>
        </div>
      </div>

      <div className="config-grid">
        {/* Card ETL */}
        <div className="config-section panel">
          <div className="config-section-title">
            <Play size={14} />
            Pipeline ETL — Ingestão de Dados
          </div>
          <p className="config-section-desc">
            Dispara o pipeline de ingestão de dados do INPE para a data selecionada.
            O sistema baixa o arquivo de focos de calor, processa e carrega no banco de dados.
          </p>

          <div className="etl-controls">
            <div className="etl-date-wrap">
              <label className="filter-label">
                <Calendar size={11} /> Data para ingestão
              </label>
              <input
                className="filter-input"
                type="date"
                value={etlDate}
                onChange={e => setEtlDate(e.target.value)}
                disabled={etlStatus === 'loading'}
              />
            </div>
            <button
              className={`etl-btn ${etlStatus === 'loading' ? 'loading' : ''}`}
              onClick={handleETL}
              disabled={etlStatus === 'loading' || !etlDate}
            >
              {etlStatus === 'loading' ? (
                <>
                  <Loader2 size={14} className="spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Executar ETL
                </>
              )}
            </button>
          </div>

          {/* Resultado */}
          {etlStatus === 'success' && etlResult && (
            <div className="etl-result success">
              <CheckCircle2 size={16} />
              <div>
                <strong>{etlResult.mensagem}</strong>
                <span className="etl-result-detail">
                  {etlResult.registros} registros processados · Data: {etlResult.data}
                </span>
              </div>
            </div>
          )}

          {etlStatus === 'error' && (
            <div className="etl-result error">
              <XCircle size={16} />
              <div>
                <strong>Erro no ETL</strong>
                <span className="etl-result-detail">{etlError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Card Status do Sistema */}
        <div className="config-section panel">
          <div className="config-section-title">
            <Server size={14} />
            Status do Sistema
          </div>

          {healthLoading ? (
            <div className="status-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="status-item">
                  <div className="skeleton-cell" style={{ width: '100%', height: '40px' }} />
                </div>
              ))}
            </div>
          ) : health ? (
            <div className="status-grid">
              <div className="status-item">
                <div className="status-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--green)' }}>
                  <Globe size={16} />
                </div>
                <div className="status-info">
                  <span className="status-label">API</span>
                  <span className="status-value">{health.status}</span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon" style={{ background: dbOk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: dbOk ? 'var(--green)' : '#ef4444' }}>
                  <Database size={16} />
                </div>
                <div className="status-info">
                  <span className="status-label">Banco de Dados</span>
                  <span className="status-value" style={{ color: dbOk ? 'var(--green)' : '#ef4444' }}>
                    {health.banco}
                  </span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent)' }}>
                  <Server size={16} />
                </div>
                <div className="status-info">
                  <span className="status-label">Aplicação</span>
                  <span className="status-value">{health.api}</span>
                </div>
              </div>

              <div className="status-item">
                <div className="status-icon" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                  <Settings size={16} />
                </div>
                <div className="status-info">
                  <span className="status-label">Versão</span>
                  <span className="status-value">v{health.versao}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="etl-result error">
              <AlertCircle size={16} />
              <div>
                <strong>API Indisponível</strong>
                <span className="etl-result-detail">
                  Não foi possível conectar ao backend. Verifique se o Docker está rodando.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informações do Projeto */}
      <div className="panel config-about">
        <div className="config-section-title">
          <AlertCircle size={14} />
          Sobre o Projeto
        </div>
        <div className="about-grid">
          <div className="about-item">
            <span className="about-label">Projeto</span>
            <span className="about-value">AtmosMetrics — Dev Web II</span>
          </div>
          <div className="about-item">
            <span className="about-label">Desenvolvedores</span>
            <span className="about-value">Luiz Henrique Gomes de Oliveira · Kaio Correia</span>
          </div>
          <div className="about-item">
            <span className="about-label">Stack</span>
            <span className="about-value">React 19 + FastAPI + PostgreSQL + PostGIS</span>
          </div>
          <div className="about-item">
            <span className="about-label">Fonte de Dados</span>
            <span className="about-value">INPE — Programa Queimadas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
