import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'gold' | 'emerald' | 'navy' | 'option';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isSelected?: boolean;
  children: ReactNode;
}

export function PixelButton({
  variant = 'gold',
  isSelected = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: PixelButtonProps) {
  const selectedClass = variant === 'option' && isSelected ? 'pixel-btn--option-selected' : '';
  return (
    <button
      type={type}
      className={`pixel-btn pixel-btn--${variant} ${selectedClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
