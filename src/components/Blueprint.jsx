/**
 * A technical drawing of how BOT Pulse works, in the blueprint spirit of the V7 security sheet: thin double frame,
 * dashed connectors, orange anchors. It is a diagram of the real data flow, not decoration.
 */
const BOX = 'fill-paper2 stroke-rule'
const node = (x, y, w, h, title, sub) => (
  <g key={title}>
    <rect x={x} y={y} width={w} height={h} rx="8" className={BOX} strokeWidth="1.5" />
    <text x={x + 18} y={y + h / 2 - 2} className="fill-ink" style={{ font: '600 17px var(--font-display)' }}>{title}</text>
    <text x={x + 18} y={y + h / 2 + 20} className="fill-muted" style={{ font: '400 13px var(--font-body)' }}>{sub}</text>
  </g>
)
const dotA = (cx, cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" className="fill-accent" />
const line = (d) => <path key={d} d={d} className="flow-line" />
const tag = (x, y, t) => <text key={t + x} x={x} y={y} className="fill-muted" style={{ font: '400 13px var(--font-body)' }}>{t}</text>

export default function Blueprint() {
  return (
    <figure className="panel overflow-x-auto p-3">
      <div className="min-w-[760px] rounded border border-dashed border-rule p-3">
        <svg viewBox="0 0 960 330" width="100%" role="img" aria-label="How BOT Pulse works: your browser reads the Mainnet and Testnet RPC endpoints, which expose BOT Chain. A pin goes from your browser to your wallet, which signs it into the PinBoard contract on the chain.">
          {line('M205 150 C 300 150 300 66 395 66')}{line('M205 165 C 300 165 300 164 395 164')}{line('M205 180 C 300 180 300 262 395 262')}
          {line('M575 66 C 660 66 660 140 745 140')}{line('M575 164 C 660 164 660 160 745 160')}{line('M575 262 C 660 262 660 190 745 190')}
          {node(35, 120, 170, 90, 'Your browser', 'reads and shows')}
          {node(395, 24, 180, 84, 'Mainnet RPC', 'public, chain 677')}
          {node(395, 122, 180, 84, 'Testnet RPC', 'public, chain 968')}
          {node(395, 220, 180, 84, 'Your wallet', 'signs a pin')}
          {node(745, 110, 180, 100, 'BOT Chain', 'PinBoard lives here')}
          {[[205, 150], [205, 165], [205, 180], [395, 66], [395, 164], [395, 262], [575, 66], [575, 164], [575, 262], [745, 140], [745, 160], [745, 190]].map(([x, y]) => dotA(x, y))}
          {tag(250, 112, 'reads')}{tag(250, 232, 'asks to sign')}{tag(630, 112, 'blocks')}{tag(640, 250, 'pin')}
        </svg>
      </div>
    </figure>
  )
}
