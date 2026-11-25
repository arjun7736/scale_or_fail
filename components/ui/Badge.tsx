import React from 'react';

export type BadgeVariant = 'teal' | 'amber' | 'rose' | 'sky' | 'indigo' | 'purple' | 'emerald' | 'slate';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  teal: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  slate: 'bg-slate-800/80 text-slate-300 border-slate-700',
};

const dotColors: Record<BadgeVariant, string> = {
  teal: 'bg-teal-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  sky: 'bg-sky-400',
  indigo: 'bg-indigo-400',
  purple: 'bg-purple-400',
  emerald: 'bg-emerald-400',
  slate: 'bg-slate-400',
};

export function Badge({
  variant = 'slate',
  size = 'xs',
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[9.5px]',
    sm: 'px-2 py-0.5 text-[10.5px]',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-medium border uppercase tracking-wider ${variantStyles[variant]} ${sizeStyles} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
