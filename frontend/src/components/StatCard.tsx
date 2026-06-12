// Componente StatCard - Card de metricas com icone e animacao
import { useEffect, useState } from 'react';
import { type LucideIcon } from 'lucide-react';
import { motion, animate } from 'framer-motion';
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
  const [displayValue, setDisplayValue] = useState<string | number>(0);

  useEffect(() => {
    if (!loading && typeof value === 'number') {
      const controls = animate(0, value, {
        duration: 1.2,
        ease: "easeOut",
        onUpdate(v) {
          setDisplayValue(Math.floor(v));
        }
      });
      return controls.stop;
    } else if (!loading) {
      setDisplayValue(value);
    }
  }, [value, loading]);

  return (
    <motion.div
      className="stat-card"
      whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
        {!loading && (typeof value === 'number' ? (displayValue as number).toLocaleString('pt-BR') : displayValue)}
      </div>

      {sub && (
        <div className="stat-card-sub">
          {sub}
        </div>
      )}
    </motion.div>
  );
}
