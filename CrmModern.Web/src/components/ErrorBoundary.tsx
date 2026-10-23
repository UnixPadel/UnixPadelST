import { Component, type ReactNode } from 'react'
import { AlertOctagon } from 'lucide-react'
import i18n from '@/i18n/i18n'

/**
 * Faz 8.10 — Global hata sınırı. Bir render hatası tüm uygulamayı çökertmesin;
 * kullanıcıya kibar bir geri-dönüş ve "Yeniden Dene" düğmesi sunulur.
 *
 * React `react-error-boundary` paketini eklemek yerine sınıf-bazlı klasik
 * implementasyon — minimum bağımlılık.
 */
interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // İleride Sentry/AppInsights vb. buradan bağlanabilir.
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    // Sınıf bileşeni: hook yok, metinler doğrudan i18n örneğinden.
    const t = i18n.t.bind(i18n)

    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-background">
        <div className="max-w-lg w-full text-center space-y-3">
          <div className="flex justify-center text-destructive">
            <AlertOctagon className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-semibold">{t('errorPage.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('errorPage.description')}</p>
          <pre className="text-xs text-left bg-muted rounded p-3 overflow-x-auto max-h-40">
            {this.state.error.message}
          </pre>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.reset}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
            >
              {t('errorPage.retry')}
            </button>
            <button
              // HashRouter: '/dashboard' adresi uygulamanın dışına çıkıyordu.
              onClick={() => { window.location.hash = '#/dashboard'; this.reset() }}
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-accent"
            >
              {t('errorPage.home')}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
