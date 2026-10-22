import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** QW-3 — 'sm' yoğun filtre/grid alanları için (eski `h-8 text-xs` ezmeleri). */
  inputSize?: 'default' | 'sm'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, inputSize = 'default', ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        // Hatalı alan: kırmızı çerçeve (FormField aria-invalid verir).
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
        inputSize === 'sm' ? 'h-8 px-2 py-1 text-xs' : 'h-10',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
