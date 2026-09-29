import { Compass } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { navigate, paths } from '../router/router'

export function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="space-y-4">
        <Compass className="mx-auto size-14 text-gold-300" strokeWidth={1.5} />
        <h1 className="font-display text-3xl font-bold text-white">Такого стола нет</h1>
        <p className="text-slate-400">Похоже, вы свернули не туда. Вернёмся в лобби?</p>
        <Button variant="gold" size="lg" onClick={() => navigate(paths.lobby)}>
          В лобби
        </Button>
      </div>
    </div>
  )
}
