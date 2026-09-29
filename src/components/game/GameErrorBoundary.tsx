import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  gameName: string
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Keeps a crashing game from taking down the whole platform. */
export class GameErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.gameName}]`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="glass grid min-h-[40vh] place-items-center rounded-3xl p-8 text-center">
        <div className="max-w-sm space-y-3">
          <p className="font-display text-xl font-bold text-white">Стол временно закрыт</p>
          <p className="text-sm text-slate-400">
            В игре «{this.props.gameName}» произошла ошибка. Ваш баланс в безопасности.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-xl bg-gold-400 px-4 py-2 text-sm font-bold text-ink-950"
          >
            Перезапустить игру
          </button>
        </div>
      </div>
    )
  }
}
