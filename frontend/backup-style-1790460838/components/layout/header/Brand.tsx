import React from 'react';

export interface BrandProps {
  logo?: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  compact?: boolean;
}

export default function Brand({ logo, title, subtitle, href, onClick, compact }: BrandProps) {
  const Wrapper: any = href ? 'a' : 'div';
  return (
    <Wrapper href={href} onClick={onClick} className={`flex items-center gap-3 ${compact ? 'text-sm' : ''}`}>
      {logo && <div className="h-10 w-10 flex items-center justify-center">{logo}</div>}
      <div className="hidden sm:flex flex-col leading-tight">
        <span className="font-semibold">{title}</span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      <span className="sm:hidden font-semibold">{title}</span>
    </Wrapper>
  );
}
