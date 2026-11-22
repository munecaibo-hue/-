import type { ReactNode } from 'react';

type PanelTone = 'parchment' | 'navy' | 'dark';

interface PixelPanelProps {
  tone?: PanelTone;
  className?: string;
  children: ReactNode;
}

export function PixelPanel({ tone = 'parchment', className = '', children }: PixelPanelProps) {
  return <section className={`pixel-panel pixel-panel--${tone} ${className}`.trim()}>{children}</section>;
}
