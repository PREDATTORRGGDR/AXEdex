import { Compass } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { navigate, paths } from '../router/router'

export function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="space-y-4">
        <Compass className="mx-auto size-14 text-neon-emerald drop-shadow-[0_0_12px_rgba(25,245,163,0.6)]" strokeWidth={1.5} />
        <h1 className="font-display text-3xl font-bold text-white">Такого столу немає</h1>
        <p className="text-slate-400">Схоже, ви звернули не туди. Повернімося до лобі?</p>
        <Button variant="emerald" size="lg" onClick={() => navigate(paths.lobby)}>
          До лобі
        </Button>
      </div>
    </div>
  )
}
