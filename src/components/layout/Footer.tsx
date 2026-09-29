import { ShieldCheck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="px-4 pb-28 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 border-t border-white/5 pt-6 text-center text-[11px] leading-relaxed text-slate-500 sm:flex-row sm:text-left">
        <ShieldCheck className="size-5 shrink-0 text-emerald-400/70" />
        <p>
          AXEdex — развлекательный симулятор. Здесь нет реальных денег, депозитов, выводов, криптовалют и платёжных
          систем. Фишки виртуальные, выдаются бесплатно и не имеют никакой ценности.
        </p>
      </div>
    </footer>
  )
}
