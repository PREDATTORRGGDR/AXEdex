import {
  Aperture,
  ArrowUpDown,
  Bomb,
  Cherry,
  Club,
  Dice5,
  Disc3,
  Grid3x3,
  Pyramid,
  Rocket,
  Spade,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '../components/ui/iconNames'
import type { GameId } from './ids'

export type GameCategory = 'table' | 'cards' | 'slots' | 'instant'

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  table: 'Настольные',
  cards: 'Карточные',
  slots: 'Слоты и колёса',
  instant: 'Быстрые',
}

export type ArtMotif = 'rings' | 'cards' | 'reels' | 'curve' | 'pegs' | 'grid' | 'dice' | 'wheel' | 'arrows'

export interface GameMeta {
  id: GameId
  name: string
  tagline: string
  category: GameCategory
  icon: LucideIcon
  /** Colour illustration used on covers, menus and headers. */
  emoji: IconName
  /** Two-stop gradient used for the game's artwork and accents. */
  colors: [string, string]
  motif: ArtMotif
  /** Theoretical return to player, in percent. */
  rtp: number
  volatility: 'низкая' | 'средняя' | 'высокая'
  badge?: 'Хит' | 'Новинка' | 'Джекпот'
  rules: string[]
}

export const GAMES: Record<GameId, GameMeta> = {
  roulette: {
    id: 'roulette',
    emoji: 'roulette',
    name: 'Кибер-рулетка',
    tagline: 'Европейское колесо с одним зеро',
    category: 'table',
    icon: Disc3,
    colors: ['#f43f5e', '#7f1d1d'],
    motif: 'rings',
    rtp: 97.3,
    volatility: 'средняя',
    badge: 'Хит',
    rules: [
      'Выберите номинал фишки и разложите ставки на столе. Повторное нажатие добавляет фишку.',
      'Ставка на число платит 35:1, на дюжину или колонку — 2:1.',
      'Красное/Чёрное, Чёт/Нечет, 1–18/19–36 платят 1:1.',
      'Выпадение зеро (0) проигрывает все внешние ставки.',
      'Нажмите «Крутить» — шарик сам решит исход раунда.',
    ],
  },
  blackjack: {
    id: 'blackjack',
    emoji: 'blackjack-cards',
    name: 'Элитный блэкджек',
    tagline: 'Классическое «21» против дилера',
    category: 'cards',
    icon: Spade,
    colors: ['#10b981', '#064e3b'],
    motif: 'cards',
    rtp: 99.4,
    volatility: 'низкая',
    badge: 'Хит',
    rules: [
      'Наберите больше очков, чем дилер, но не больше 21.',
      'Блэкджек (туз и десятка с раздачи) платит 3:2.',
      'Дилер добирает до 17 и останавливается на мягких 17.',
      'Удвоение доступно на любых двух картах, в том числе после сплита.',
      'Пары можно разделить до 4 рук; разделённые тузы получают по одной карте.',
      'Если у дилера открыт туз, предлагается страховка — она платит 2:1.',
      'Шуз из 6 колод перемешивается, когда в нём остаётся меньше четверти карт.',
    ],
  },
  slots: {
    id: 'slots',
    emoji: 'slot-machine',
    name: 'Неон-слоты 777',
    tagline: '5 барабанов, 10 линий, вайлды и фриспины',
    category: 'slots',
    icon: Cherry,
    colors: ['#e879f9', '#6d28d9'],
    motif: 'reels',
    rtp: 96.1,
    volatility: 'высокая',
    badge: 'Джекпот',
    rules: [
      'Выберите ставку на линию — одновременно играют все 10 линий.',
      'Выигрыш даёт комбинация из 3–5 одинаковых символов подряд, начиная с левого барабана.',
      'Звезда — вайлд: заменяет любой символ, кроме скаттера.',
      'Три и более кристалла-скаттера в любом месте запускают 10 фриспинов с множителем ×2.',
      'Во время фриспинов скаттеры добавляют ещё 5 бесплатных вращений.',
    ],
  },
  crash: {
    id: 'crash',
    emoji: 'rocket',
    name: 'Ракета',
    tagline: 'Забери множитель до взрыва',
    category: 'instant',
    icon: Rocket,
    colors: ['#22d3ee', '#1e3a8a'],
    motif: 'curve',
    rtp: 97,
    volatility: 'высокая',
    badge: 'Хит',
    rules: [
      'Сделайте ставку и запустите ракету.',
      'Пока ракета летит, множитель растёт по экспоненте.',
      'Нажмите «Забрать» до взрыва — ставка умножится на текущий множитель.',
      'Если ракета взорвётся раньше, ставка сгорает.',
      'Автовывод заберёт выигрыш сам, как только множитель достигнет заданного значения.',
    ],
  },
  plinko: {
    id: 'plinko',
    emoji: 'plinko',
    name: 'Плинко',
    tagline: 'Шарик, штырьки и множители',
    category: 'instant',
    icon: Pyramid,
    colors: ['#a78bfa', '#86198f'],
    motif: 'pegs',
    rtp: 98.5,
    volatility: 'средняя',
    badge: 'Новинка',
    rules: [
      'Выберите число рядов (8, 12 или 16) и уровень риска.',
      'Шарик отскакивает от штырьков и падает в лунку с множителем.',
      'Крайние лунки выпадают реже всего и платят больше всего.',
      'Можно запускать несколько шариков одновременно.',
    ],
  },
  mines: {
    id: 'mines',
    emoji: 'bomb',
    name: 'Мины',
    tagline: 'Открывай кристаллы, обходи бомбы',
    category: 'instant',
    icon: Bomb,
    colors: ['#fbbf24', '#9a3412'],
    motif: 'grid',
    rtp: 97,
    volatility: 'высокая',
    rules: [
      'Выберите количество мин (от 1 до 24) на поле 5×5.',
      'Каждая открытая безопасная клетка увеличивает множитель.',
      'Заберите выигрыш в любой момент после первой открытой клетки.',
      'Если откроете мину, ставка сгорает.',
    ],
  },
  dice: {
    id: 'dice',
    emoji: 'game-die',
    name: 'Дуэль костей',
    tagline: 'Больше, меньше или ровно семь',
    category: 'table',
    icon: Dice5,
    colors: ['#fb7185', '#881337'],
    motif: 'dice',
    rtp: 97.9,
    volatility: 'низкая',
    rules: [
      'Режим «Больше/Меньше»: угадайте сумму двух костей относительно семи.',
      '«Меньше 7» и «Больше 7» платят ×2,35, «Ровно 7» — ×5,8.',
      'Режим «Крэпс-лайт»: ставка «Пас» выигрывает на 7 или 11 первым броском и проигрывает на 2, 3 или 12.',
      'Любое другое число становится пойнтом: выбросьте его снова раньше семёрки.',
      '«Не пас» — зеркальная ставка; 12 на первом броске возвращает ставку.',
    ],
  },
  wheel: {
    id: 'wheel',
    emoji: 'fortune-wheel',
    name: 'Колесо фортуны',
    tagline: 'Хай-тек колесо с джекпот-сектором',
    category: 'slots',
    icon: Aperture,
    colors: ['#34f5a0', '#0e7490'],
    motif: 'wheel',
    rtp: 96.5,
    volatility: 'средняя',
    badge: 'Джекпот',
    rules: [
      'Выберите уровень риска: чем он выше, тем больше пустых секторов и крупнее множители.',
      'Колесо остановится на секторе — ставка умножится на его множитель.',
      'Золотой сектор джекпота платит до ×50.',
    ],
  },
  poker: {
    id: 'poker',
    emoji: 'joker',
    name: 'Видеопокер',
    tagline: '«Валеты или старше», пять карт',
    category: 'cards',
    icon: Club,
    colors: ['#60a5fa', '#312e81'],
    motif: 'cards',
    rtp: 99.5,
    volatility: 'средняя',
    rules: [
      'Получите 5 карт и отметьте те, что хотите оставить.',
      'Нажмите «Обмен» — остальные карты заменятся новыми.',
      'Выплата зависит от итоговой комбинации — от пары валетов до роял-флеша.',
      'Ставка в 5 кредитов повышает выплату за роял-флеш до 800 за кредит.',
    ],
  },
  keno: {
    id: 'keno',
    emoji: 'input-numbers',
    name: 'Кено',
    tagline: 'Выбери до 10 чисел из 40',
    category: 'instant',
    icon: Grid3x3,
    colors: ['#2dd4bf', '#134e4a'],
    motif: 'grid',
    rtp: 95.5,
    volatility: 'высокая',
    rules: [
      'Отметьте от 1 до 10 чисел на поле из 40.',
      'Затем выпадают 10 случайных чисел.',
      'Выплата зависит от того, сколько чисел вы выбрали и сколько из них совпало.',
      'Кнопка «Случайно» заполнит билет за вас.',
    ],
  },
  hilo: {
    id: 'hilo',
    emoji: 'crystal-ball',
    name: 'Выше-Ниже',
    tagline: 'Угадай следующую карту',
    category: 'cards',
    icon: ArrowUpDown,
    colors: ['#fb923c', '#7c2d12'],
    motif: 'arrows',
    rtp: 97,
    volatility: 'средняя',
    badge: 'Новинка',
    rules: [
      'Угадайте, будет ли следующая карта старше или младше текущей.',
      'Каждый верный прогноз умножает выигрыш; чем менее вероятен прогноз, тем больше множитель.',
      'Равная по старшинству карта засчитывается в пользу варианта «или равно».',
      'Туз — старшая карта, двойка — младшая. Карту можно пропустить.',
      'Заберите выигрыш в любой момент после первого угаданного хода.',
    ],
  },
}

export const GAME_LIST: GameMeta[] = Object.values(GAMES)
