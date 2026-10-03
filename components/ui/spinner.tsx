export function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className="border-3 border-primary border-t-transparent rounded-full animate-spin"
      style={{ width: size * 4, height: size * 4 }}
    />
  )
}
