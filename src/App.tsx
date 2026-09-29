import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect } from 'react'
import { Background } from './components/layout/Background'
import { GamesSheet, MobileNav } from './components/layout/MobileNav'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { GameShell } from './components/game/GameShell'
import { CelebrationLayer } from './components/ui/CelebrationLayer'
import { Modal } from './components/ui/Modal'
import { Toaster } from './components/ui/Toaster'
import { RewardsPanel } from './components/wallet/RewardsPanel'
import { GAMES } from './games/meta'
import { Lobby } from './pages/Lobby'
import { NotFound } from './pages/NotFound'
import { Profile } from './pages/Profile'
import { routeKey, useRoute, type Route } from './router/router'
import { useUi } from './store/ui'

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'lobby':
      return <Lobby />
    case 'profile':
      return <Profile />
    case 'game':
      return <GameShell id={route.id} />
    default:
      return <NotFound />
  }
}

function documentTitle(route: Route): string {
  const base = 'AXEdex'
  if (route.name === 'game') return `${GAMES[route.id].name} · ${base}`
  if (route.name === 'profile') return `Профиль · ${base}`
  return `${base} · Симулятор казино`
}

export default function App() {
  const route = useRoute()
  const key = routeKey(route)
  const { rewardsOpen, setRewardsOpen } = useUi()

  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = documentTitle(route)
  }, [route])

  return (
    <MotionConfig reducedMotion="user">
      <Background />
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 pt-2 pb-28 sm:px-6 lg:px-8 lg:pb-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                <Page route={route} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <MobileNav />
      <GamesSheet />
      <Modal open={rewardsOpen} onClose={() => setRewardsOpen(false)} title="Бесплатные фишки">
        <RewardsPanel />
      </Modal>
      <Toaster />
      <CelebrationLayer />
    </MotionConfig>
  )
}
