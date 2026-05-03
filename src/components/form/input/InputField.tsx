import type React from 'react'
import type { FC } from 'react'

interface InputProps {
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'time' | string
  id?: string
  name?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  min?: string
  max?: string
  step?: number
  disabled?: boolean
  success?: boolean
  error?: boolean
  hint?: string
}

const Input: FC<InputProps> = ({
  type = 'text',
  id,
  name,
  placeholder,
  value,
  onChange,
  className = '',
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  let inputClasses = `h-12 w-full appearance-none rounded-xl border px-4 py-2.5 text-sm shadow-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-gray-400 focus:outline-hidden focus:ring-[3px] dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${className}`

  if (disabled) {
    inputClasses += ` cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 opacity-60 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-500`
  } else if (error) {
    inputClasses += ` border-error-500 focus:border-error-400 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-600`
  } else if (success) {
    inputClasses += ` border-success-500 focus:border-success-400 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-600`
  } else {
    inputClasses += ` border-gray-200 bg-white text-gray-900 focus:border-brand-400 focus:ring-brand-500/15 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white/90 dark:focus:border-brand-500`
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
      />

      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error ? 'text-error-500' : success ? 'text-success-500' : 'text-gray-500'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

export default Input
