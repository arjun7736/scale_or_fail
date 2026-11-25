import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({
  glass = true,
  className = '',
  children,
  ...props
}: CardProps) {
  const bgStyle = glass
    ? 'bg-slate-900/90 backdrop-blur-md border-slate-800/90'
    : 'bg-slate-900 border-slate-800';

  return (
    <div
      className={`rounded-xl border shadow-xl ${bgStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
