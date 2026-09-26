import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { t } from '@/locales/i18n';

interface BrandProps {
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;
  href?: string;
  compact?: boolean;
}

export default function Brand({ logo, title, subtitle, href = '/', compact = false }: BrandProps) {
  return (
    <Link to={href} className="flex items-center gap-3 cursor-pointer">
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow">
        {logo || <Zap className="h-5 w-5" />}
      </div>
      {!compact && (
        <div className="hidden sm:flex flex-col" style={{ minWidth: 180 }}>
          <span className="text-base font-semibold text-foreground">{title || t('app.title') || 'Консоль Лиума'}</span>
          <span className="text-xs text-muted-foreground">{subtitle || t('app.subtitle') || 'Панель управления'}</span>
        </div>
      )}
    </Link>
  );
}
