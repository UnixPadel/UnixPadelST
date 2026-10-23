/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // QW-1 — semantik durum tonları (index.css). Kullanım:
        //   bg-success-soft text-success-soft-foreground border-success/30
        ...Object.fromEntries(
          ['success', 'warning', 'danger', 'info', 'progress', 'neutral'].map((tone) => [tone, {
            DEFAULT: `hsl(var(--${tone}))`,
            soft: `hsl(var(--${tone}-soft))`,
            'soft-foreground': `hsl(var(--${tone}-soft-foreground))`,
          }]),
        ),

        // Faz 8.6 — WinForms grid renkleri BIREBIR (hex):
        //   Onaylandı           RGB(198,239,206) #C6EFCE
        //   Muhasebe Tamamlandı RGB(221,235,247) #DDEBF7
        //   Ön Onaylandı        RGB(189,215,238) #BDD7EE
        //   Reddedildi          RGB(255,199,206) #FFC7CE
        //   Bekliyor/diğer      RGB(255,235,156) #FFEB9C
        'purchase-onay':     '#C6EFCE',
        'purchase-muhasebe': '#DDEBF7',
        'purchase-on':       '#BDD7EE',
        'purchase-red':      '#FFC7CE',
        'purchase-bekle':    '#FFEB9C',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Scaling Faz 3 — konteyner sorguları (ek bağımlılık yok). Breakpoint'ler
    // pencereye bakar; içerik genişliği ise sidebar/zoom'a göre değişir. Kapsayıcıya
    // `cq` verilir, çocuklar `cq-md:` / `cq-lg:` … ile kabın genişliğine göre dizilir.
    function ({ addUtilities, addVariant }) {
      addUtilities({ '.cq': { 'container-type': 'inline-size' } })
      const sizes = { sm: '30rem', md: '40rem', lg: '56rem', xl: '72rem', '2xl': '86rem' }
      for (const [name, min] of Object.entries(sizes)) addVariant(`cq-${name}`, `@container (min-width: ${min})`)
    },
  ],
}
