import { type LucideIcon } from 'lucide-react';
import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: string;       // cor CSS var ou hex
  iconBg?: string;
  cardGlow?: string;
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'var(--accent)',
  iconBg = 'rgba(59,130,246,0.1)',
  cardGlow,
  loading = false,
}: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{
        '--card-accent': accent,
        '--card-icon-bg': iconBg,
        '--card-glow': cardGlow,
      } as React.CSSProperties}
    >
      <div className="stat-card-bar" />

      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon">
          <Icon size={16} />
        </div>
      </div>

      <div className={`stat-card-value ${loading ? 'loading' : ''}`}>
        {!loading && (typeof value === 'number' ? value.toLocaleString('pt-BR') : value)}
      </div>

      {sub && (
        <div className="stat-card-sub">
          {sub}
        </div>
      )}
    </div>
  );
}
