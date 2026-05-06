import { useState } from 'react'

interface Props {
  value: number
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

  function getValueFromEvent(e: React.MouseEvent | React.TouchEvent, star: number): number {
    let clientX: number
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
    } else {
      clientX = e.clientX
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = clientX - rect.left
    return x < rect.width / 2 ? star - 0.5 : star
  }

  function handleMouseMove(e: React.MouseEvent, star: number) {
    if (readonly) return
    setHover(getValueFromEvent(e, star))
  }

  function handleClick(e: React.MouseEvent, star: number) {
    if (readonly || !onChange) return
    onChange(getValueFromEvent(e, star))
  }

  function handleTouchEnd(e: React.TouchEvent, star: number) {
    if (readonly || !onChange) return
    e.preventDefault()
    const val = getValueFromEvent(e, star)
    setHover(val)
    onChange(val)
  }

  function starStyle(fill: 'full' | 'half' | 'empty'): React.CSSProperties {
    const base: React.CSSProperties = {
      fontSize: size,
      lineHeight: 1,
      cursor: readonly ? 'default' : 'pointer',
      userSelect: 'none',
      display: 'inline-block',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
    }
    if (fill === 'full') return { ...base, color: '#9a6c00' }
    if (fill === 'empty') return { ...base, color: '#ccc' }
    return {
      ...base,
      background: 'linear-gradient(to right, #9a6c00 50%, #ccc 50%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }
  }

  return (
    <div
      style={{ display: 'inline-flex', gap: 3 }}
      onMouseLeave={() => !readonly && setHover(null)}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const fill = getStarFill(star)
        return (
          <span
            key={star}
            style={starStyle(fill)}
            onMouseMove={e => handleMouseMove(e, star)}
            onClick={e => handleClick(e, star)}
            onTouchEnd={e => handleTouchEnd(e, star)}
          >
            ★
          </span>
        )
      })}
    </div>
  )
}

export function StarDisplay({ value, size = 13 }: { value: number; size?: number }) {
  return <StarRating value={value} readonly size={size} />
}