import { useState } from 'react'

interface Props {
  value: number        // 0 - 5 in 0.5 increments
  onChange?: (v: number) => void
  readonly?: boolean
  size?: number
}

export function StarRating({ value, onChange, readonly = false, size = 22 }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const display = hover ?? value

  function getStarFill(star: number): 'full' | 'half' | 'empty' {
    if (display >= star) return 'full'
    if (display >= star - 0.5) return 'half'
    return 'empty'
  }

  function handleMouseMove(e: React.MouseEvent, star: number) {
    if (readonly) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const half = x < rect.width / 2
    setHover(half ? star - 0.5 : star)
  }

  function handleClick(e: React.MouseEvent, star: number) {
    if (readonly || !onChange) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const half = x < rect.width / 2
    onChange(half ? star - 0.5 : star)
  }

  return (
    <div
      style={{ display: 'inline-flex', gap: 2 }}
      onMouseLeave={() => !readonly && setHover(null)}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const fill = getStarFill(star)
        return (
          <span
            key={star}
            onMouseMove={e => handleMouseMove(e, star)}
            onClick={e => handleClick(e, star)}
            style={{
              fontSize: size,
              lineHeight: 1,
              cursor: readonly ? 'default' : 'pointer',
              userSelect: 'none',
              display: 'inline-block',
              position: 'relative',
              ...(fill === 'full' ? { color: '#9a6c00' } :
                  fill === 'empty' ? { color: '#ccc' } : {}),
              ...(fill === 'half' ? {
                background: 'linear-gradient(to right, #9a6c00 50%, #ccc 50%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              } : {}),
            }}
          >
            ★
          </span>
        )
      })}
    </div>
  )
}

// Read-only display version for showing ratings
export function StarDisplay({ value, size = 13 }: { value: number; size?: number }) {
  return <StarRating value={value} readonly size={size} />
}
