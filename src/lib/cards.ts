import { secureRandom, shuffle, type Rng } from './rng'

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
/** 2–10 are pips, 11 = валет, 12 = дама, 13 = король, 14 = туз. */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  id: string
  rank: Rank
  suit: Suit
}

export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

/** Russian card indices: В (валет), Д (дама), К (король), Т (туз). */
export const RANK_LABEL: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'В',
  12: 'Д',
  13: 'К',
  14: 'Т',
}

export const RANK_NAME: Record<Rank, string> = {
  2: 'двойка',
  3: 'тройка',
  4: 'четвёрка',
  5: 'пятёрка',
  6: 'шестёрка',
  7: 'семёрка',
  8: 'восьмёрка',
  9: 'девятка',
  10: 'десятка',
  11: 'валет',
  12: 'дама',
  13: 'король',
  14: 'туз',
}

export const SUIT_SYMBOL: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
export const SUIT_NAME: Record<Suit, string> = { spades: 'пик', hearts: 'червей', diamonds: 'бубен', clubs: 'треф' }

export const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds'

export function cardName(card: Card): string {
  return `${RANK_NAME[card.rank]} ${SUIT_NAME[card.suit]}`
}

/** Ordered deck(s). Each card id is unique across the whole shoe. */
export function createDeck(decks = 1): Card[] {
  const cards: Card[] = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ id: `${d}-${suit}-${rank}`, rank, suit })
    }
  }
  return cards
}

export function shuffledDeck(decks = 1, rng: Rng = secureRandom): Card[] {
  return shuffle(createDeck(decks), rng)
}
