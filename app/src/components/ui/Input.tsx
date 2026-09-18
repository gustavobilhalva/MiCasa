import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`min-h-12 w-full rounded-xl border border-line bg-card px-4 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none ${className}`}
      {...props}
    />
  )
})
