import * as React from 'react'
import { cn } from '@/lib/utils'

function Button({ className, variant = 'default', size = 'default', ...props }: React.ComponentProps<'button'> & {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}) {
  // Map variants to the simpler theme classes defined in src/index.css
  const variantMap: Record<string, string> = {
    default: 'btn btn--primary',
    destructive: 'btn btn--danger',
    outline: 'btn btn--ghost',
    secondary: 'btn btn--secondary',
    ghost: 'btn btn--ghost',
    link: 'btn btn--ghost',
  }

  const sizeMap: Record<string, string> = {
    default: '',
    sm: 'btn--sm',
    lg: 'btn--lg',
    icon: 'icon-btn',
  }

  const variantClass = variantMap[variant] ?? variantMap.default
  const sizeClass = sizeMap[size] ?? ''

  return (
    <button
      className={cn(
        variantClass,
        sizeClass,
        // ensure we still allow additional utility classes passed by callers
        className
      )}
      {...props}
    />
  )
}

export { Button }
