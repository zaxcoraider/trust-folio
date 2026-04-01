'use client';

import { HTMLAttributes } from 'react';

interface NeonCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'purple' | 'cyan' | 'pink' | 'none';
  hover?: boolean;
}

export function NeonCard({
  children,
  className = '',
  glow = 'purple',
  hover = true,
  ...props
}: NeonCardProps) {
  const glowBorder = {
    purple: 'border-neon-purple/25 hover:border-neon-purple/50',
    cyan: 'border-neon-cyan/25 hover:border-neon-cyan/50',
    pink: 'border-neon-pink/25 hover:border-neon-pink/50',
    none: 'border-white/5',
  }[glow];

  const glowShadow = {
    purple: 'hover:shadow-neon-purple',
    cyan: 'hover:shadow-neon-cyan',
    pink: 'hover:shadow-neon-pink',
    none: '',
  }[glow];

  return (
    <div
      className={`
        relative rounded-xl border bg-card-gradient backdrop-blur-sm
        bg-bg-card shadow-card-glow
        transition-all duration-300
        ${hover ? `${glowBorder} ${glowShadow} cursor-default` : 'border-white/5'}
        ${className}
      `}
      {...props}
    >
      {/* Top highlight line */}
      <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-neon-${glow === 'none' ? 'purple' : glow}/30 to-transparent`} />
      {children}
    </div>
  );
}
