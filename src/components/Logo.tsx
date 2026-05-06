export function Logo({ size = 56, color = '#ffffff' }: { size?: number; color?: string }) {
  // Use the Ate That SVG logo as an img tag from public folder
  return (
    <img
      src="/ate-that-logo.svg"
      alt="Ate That"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
    />
  )
}