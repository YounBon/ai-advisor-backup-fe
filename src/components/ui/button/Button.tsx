import { ReactNode } from 'react'

interface ButtonProps {
  children?: ReactNode // Button text or content
  type?: 'button' | 'submit' | 'reset'
  size?: 'xs' | 'sm' | 'md' // Button size
  variant?: 'primary' | 'outline' | 'ghost' // Button variant
  startIcon?: ReactNode // Icon before the text
  endIcon?: ReactNode // Icon after the text
  onClick?: () => void // Click handler
  disabled?: boolean // Disabled state
  className?: string // Disabled state
  'aria-label'?: string
}

const Button: React.FC<ButtonProps> = ({
  children,
  type = 'button',
  size = 'md',
  variant = 'primary',
  startIcon,
  endIcon,
  onClick,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  // Size Classes
  const sizeClasses = {
    xs: 'gap-1.5 px-2.5 py-1.5 text-xs font-medium',
    sm: 'gap-2 px-4 py-2.5 text-sm font-semibold',
    md: 'gap-2.5 px-6 py-4 text-[15px] font-bold tracking-tight',
  }

  // Variant Classes — primary: CTA nổi bật, có chiều sâu, không lòe loẹt
  const variantClasses = {
    primary:
      'border border-brand-600/25 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_4px_16px_-2px_rgba(70,95,255,0.45),0_2px_4px_-1px_rgba(15,23,42,0.08)] transition-all duration-200 hover:from-brand-600 hover:to-brand-700 hover:shadow-[0_8px_28px_-4px_rgba(70,95,255,0.5),0_2px_6px_-1px_rgba(15,23,42,0.1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:scale-100 disabled:opacity-60 disabled:shadow-none dark:border-brand-400/25 dark:shadow-[0_4px_24px_-4px_rgba(70,95,255,0.35)] dark:focus-visible:ring-offset-gray-950',
    outline:
      'bg-white text-gray-800 ring-1 ring-inset ring-gray-200/90 shadow-theme-xs transition-all duration-200 hover:border-brand-200/0 hover:bg-gray-50 hover:ring-brand-300/80 hover:shadow-theme-sm dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-white/5 dark:hover:ring-brand-500/30',
    ghost:
      'text-brand-700 shadow-sm shadow-transparent ring-1 ring-transparent transition-all duration-200 hover:bg-brand-50/95 hover:text-brand-800 hover:shadow-md hover:shadow-brand-500/8 hover:ring-brand-200/70 dark:text-brand-300 dark:hover:bg-brand-500/12 dark:hover:text-brand-200 dark:hover:ring-brand-500/25',
  }

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  )
}

export default Button
