export default function Logo({ size = 28 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/brand/botpulse-logo.svg" width={size} height={size} alt="" />
      <span className="font-display text-xl font-semibold tracking-tight">BOT Pulse</span>
    </span>
  )
}
