import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // 0.3.4 — çerçeve alanlardan (border-input) açık: buton giriş alanıyla karışmaz.
        outline: 'border border-border-strong bg-card hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // 40+ ergonomi — yükseklikler ölçek tokenlarından (Rahat 44/40/36/48px,
        // Standart 40/36/32/44px). Önceki xs ve icon-sm 28px'ti (Fitts hedefi altında).
        default: 'h-ctl-md px-4 py-2',
        sm: 'h-ctl-sm rounded-md px-3',
        // QW-3 — yoğun gridler/araç çubukları için (eski `h-7 text-xs` ezmeleri).
        xs: 'h-ctl-xs rounded-md px-2.5 text-xs gap-1.5',
        lg: 'h-ctl-lg rounded-md px-8',
        icon: 'h-ctl-md w-ctl-md',
        'icon-sm': 'h-ctl-xs w-ctl-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** QW-3 — bekleme durumu: spinner + disabled + aria-busy. */
  loading?: boolean
  /**
   * 40+ ergonomi (2.4) — buton devre dışıyken sebebi yalnız üzerine gelince açılan
   * ipucunda değil, butonun altında görünür metin olarak yazılır. Verilince buton
   * bir sarmalayıcıya alınır (`wrapperClassName` ile genişlik verilebilir).
   */
  disabledReason?: string | null
  wrapperClassName?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, disabledReason, wrapperClassName, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const reasonId = React.useId()
    if (asChild) {
      return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>{children}</Comp>
    }
    const showReason = !!disabled && !loading && !!disabledReason
    const button = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-describedby={showReason ? reasonId : undefined}
        {...props}
      >
        {loading && <Loader2 className={cn('animate-spin', size === 'xs' || size === 'icon-sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />}
        {children}
      </Comp>
    )
    if (disabledReason === undefined) return button
    return (
      <span className={cn('inline-flex flex-col gap-1', wrapperClassName)}>
        {button}
        {showReason && <span id={reasonId} className="text-xs leading-snug text-muted-foreground">{disabledReason}</span>}
      </span>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
