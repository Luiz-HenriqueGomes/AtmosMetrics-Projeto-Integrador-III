// ============================================================
// AtmosMetrics — API Service
// Camada de comunicação com o backend FastAPI em localhost:8000
// ============================================================

const BASE_URL = 'http://localhost:8000/api/v1';

// ---- Interfaces de Resposta ----

// Estrutura real retornada pelo endpoint /api/v1/anomalias/resumo
export interface ResumoItem {
  chave: string;
  total_focos: number;
  frp_media?: string;
  frp_max?: string;
}

export interface ResumoResponse {
  total_focos: number;
  media_frp?: string;
  media_risco?: string;
  data_inicio?: string;
  data_fim?: string;
  por_uf: ResumoItem[];
  por_bioma: ResumoItem[];

  // Campos derivados calculados no frontend
  estados_afetados?: number;
  bioma_mais_afetado?: string;
  satelite_mais_ativo?: string;
  focos_por_bioma?: { bioma: string; total: number }[];
  focos_por_uf?: { uf: string; total: number }[];
  focos_por_mes?: { mes: string; total: number }[];
}

// Item individual de foco de calor (GET /api/v1/anomalias)
export interface AnomaliaItem {
  id_anomalia: number;
  latitude: string;
  longitude: string;
  frp_megawatts: string | null;
  risco_fogo: string | null;
  precipitacao_mm: string | null;
  dias_sem_chuva: number | null;
  hora_utc: string | null;
  data_completa: string | null;
  uf: string | null;
  estado: string | null;
  municipio: string | null;
  bioma: string | null;
  regiao: string | null;
  nome_satelite: string | null;
}

// Filtros para a listagem de anomalias
export interface AnomaliaFilters {
  data_inicio?: string;
  data_fim?: string;
  uf?: string;
  bioma?: string;
  satelite?: string;
  limit?: number;
  offset?: number;
}

export interface Localidade {
  id_localidade: number;
  municipio: string;
  codigo_ibge: string | null;
  uf: string;
  estado: string;
  regiao: string;
  bioma: string;
}

export interface Satelite {
  id_satelite: number;
  nome_satelite: string;
  agencia: string | null;
  descricao: string | null;
}

export interface EstadoOut {
  uf: string;
  estado: string;
  regiao: string;
}

export interface BiomaOut {
  bioma: string;
}

export interface ETLResponse {
  status: string;
  mensagem: string;
  data: string;
  registros: number;
}

export interface HealthResponse {
  status: string;
  api: string;
  versao: string;
  banco: string;
}

// ---- Função base ----

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ---- API pública ----

export const api = {
  // Dashboard
  getResumo: () => fetchAPI<ResumoResponse>('/anomalias/resumo'),

  // Anomalias / Focos de Calor
  getAnomalias: (filters: AnomaliaFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters.data_fim) params.append('data_fim', filters.data_fim);
    if (filters.uf) params.append('uf', filters.uf);
    if (filters.bioma) params.append('bioma', filters.bioma);
    if (filters.satelite) params.append('satelite', filters.satelite);
    params.append('limit', String(filters.limit ?? 100));
    params.append('offset', String(filters.offset ?? 0));
    return fetchAPI<AnomaliaItem[]>(`/anomalias/?${params.toString()}`);
  },

  // Localidades
  getLocalidades: () => fetchAPI<Localidade[]>('/localidades/'),
  getEstados: () => fetchAPI<EstadoOut[]>('/localidades/estados'),
  getBiomas: () => fetchAPI<BiomaOut[]>('/localidades/biomas'),

  // Satélites
  getSatelites: () => fetchAPI<Satelite[]>('/satelites/'),

  // ETL
  executarETL: async (data?: string): Promise<ETLResponse> => {
    const params = data ? `?data=${data}` : '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

    try {
      const response = await fetch(`${BASE_URL}/etl/executar-sync${params}`, {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const detail = typeof err.detail === 'string'
          ? err.detail
          : Array.isArray(err.detail)
            ? err.detail.map((d: any) => d.msg).join('; ')
            : `Erro na API: ${response.status}`;
        throw new Error(detail);
      }
      return response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Timeout: o ETL demorou mais de 2 minutos. Verifique os logs do backend.');
      }
      throw err;
    }
  },

  // Health Check
  getHealth: () => fetch('http://localhost:8000/').then(r => r.json() as Promise<HealthResponse>),
};
