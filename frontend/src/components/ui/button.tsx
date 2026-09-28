import * as React from 'react'
import { cn } from '@/lib/utils'

function Button({ className, variant = 'default', size = 'default', ...props }: React.ComponentProps<'button'> & {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xl'
}) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

  const variantMap: Record<string, string> = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
    outline: 'bg-transparent border border-border text-card-foreground hover:bg-surface',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 focus:ring-secondary',
    ghost: 'bg-transparent hover:bg-surface text-card-foreground',
    link: 'bg-transparent underline text-primary hover:text-primary/80',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
  }

  const sizeMap: Record<string, string> = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-2.5 py-1.5 text-sm h-8',
    lg: 'px-4 py-2.5 text-base h-10',
    xl: 'px-6 py-3 text-lg',
    icon: 'p-0 h-8 w-8 inline-flex items-center justify-center',
  }

  const variantClass = variantMap[variant] ?? variantMap.default
  const sizeClass = sizeMap[size] ?? ''

  return (
    <button
      className={cn(
        base,
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    />
  )
}

export { Button }