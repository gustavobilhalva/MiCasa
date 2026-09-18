import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-white active:bg-accent-strong disabled:opacity-50',
  secondary: 'border border-line bg-card text-ink active:bg-surface disabled:opacity-50',
  ghost: 'text-accent active:bg-accent/10 disabled:opacity-50',
  danger: 'bg-danger text-white disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-medium transition ${styles[variant]} ${className}`}
      {...props}
    />
  )
}
