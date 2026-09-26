import * as React from 'react'
import { cn } from '@/lib/utils'

function Button({ className, variant = 'default', size = 'default', ...props }: React.ComponentProps<'button'> & {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xl'
}) {
  const variantMap: Record<string, string> = {
    default: 'btn btn--primary',
    destructive: 'btn btn--danger',
    outline: 'btn btn--secondary',
    secondary: 'btn btn--secondary',
    ghost: 'btn btn--ghost',
    link: 'btn btn--ghost',
    success: 'btn btn--success',
  }

  const sizeMap: Record<string, string> = {
    default: '',
    sm: 'btn--sm',
    lg: 'btn--lg',
    xl: 'btn--xl',
    icon: 'icon-btn',
  }

  const variantClass = variantMap[variant] ?? variantMap.default
  const sizeClass = sizeMap[size] ?? ''

  return (
    <button
      className={cn(
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    />
  )
}

export { Button }