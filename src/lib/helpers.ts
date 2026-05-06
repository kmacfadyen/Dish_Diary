export const CUISINES = [
  'American', 'Italian', 'Japanese', 'Mexican', 'French', 'Thai',
  'Greek', 'Indian', 'Chinese', 'Mediterranean', 'Spanish', 'Korean',
  'Vietnamese', 'Middle Eastern', 'Caribbean', 'Other'
]

export function starsDisplay(rating: number): string {
  const r = Math.round(rating)
  return '★'.repeat(r) + '☆'.repeat(5 - r)
}

export function generateSessionCode(): string {
  const words = ['OAK', 'ELM', 'PINE', 'FERN', 'MOSS', 'IVY', 'SAGE', 'REED', 'BIRCH', 'CEDAR']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(Math.random() * 89 + 10)
  return `${word}${num}`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function avgRating(ratings: (number | null)[]): number {
  const valid = ratings.filter((r): r is number => r !== null)
  if (!valid.length) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}
