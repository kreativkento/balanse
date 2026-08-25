import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GymButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
}

export function GymButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}: GymButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 active:scale-[0.97] select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary:
      'bg-[#745b3c] text-white hover:bg-[#5e4a30] shadow-[0_4px_20px_rgba(116,91,60,0.35)]',
    secondary:
      'bg-[#EDE8D8] text-[#1E2A35] hover:bg-[#E3DCC8] border border-[#D4CDB5]',
    ghost:
      'bg-transparent text-[#1E2A35] hover:bg-[#EDE8D8]',
    outline:
      'bg-transparent text-[#745b3c] border-2 border-[#745b3c] hover:bg-[#745b3c] hover:text-white',
    danger:
      'bg-red-100/80 text-red-700 border border-red-200 hover:bg-red-100',
  };

  const sizes: Record<string, string> = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
