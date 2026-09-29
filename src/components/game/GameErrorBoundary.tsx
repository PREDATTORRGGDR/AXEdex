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
          <p className="font-display text-xl font-bold text-white">Стіл тимчасово закрито</p>
          <p className="text-sm text-slate-400">
            У грі «{this.props.gameName}» сталася помилка. Ваш баланс у безпеці.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-xl bg-neon-emerald px-4 py-2 text-sm font-bold text-[#03140d] shadow-[0_3px_0_#05603f]"
          >
            Перезапустити гру
          </button>
        </div>
      </div>
    )
  }
}
