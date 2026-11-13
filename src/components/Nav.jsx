import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useWallet } from '../lib/WalletContext.jsx'
import { shortAddr } from '../lib/wallet.js'

const LINKS = [['Dashboard', '/app'], ['Trending', '/#trending'], ['Compare', '/#compare'], ['FAQ', '/#faq']]

/** Dense balanced bar: wordmark left, the real destinations centred, the wallet and the one action right. Under 48rem the links and the wallet move into a menu. */
export default function Nav() {
  const w = useWallet()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const item = (label, href, onClick) => (href.startsWith('/#')
    ? <a href={href} onClick={onClick} className="transition-colors hover:text-ink">{label}</a>
    : <Link to={href} onClick={onClick} className="transition-colors hover:text-ink">{label}</Link>)

  const wallet = w.account
    ? <span className="btn-line cursor-default !min-h-[44px]"><span className="num">{shortAddr(w.account)}</span></span>
    : <button className="btn-line !min-h-[44px]" onClick={w.connect} disabled={w.busy || !w.hasWallet} title={w.hasWallet ? '' : 'MetaMask not detected'}>Connect wallet</button>

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8 lg:px-16" aria-label="Main">
        <Link to="/" className="shrink-0"><Logo /></Link>
        <ul className="hidden items-center gap-8 text-sm text-ink2 lg:flex">
          {LINKS.map(([label, href]) => <li key={label}>{item(label, href)}</li>)}
        </ul>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">{wallet}</div>
          <Link to="/app" className="btn !min-h-[44px] hidden sm:inline-flex">Open dashboard</Link>
          <button className="btn-line !min-h-[44px] lg:hidden" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Menu'}</button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-rule bg-paper lg:hidden">
          <ul className="mx-auto flex max-w-[1440px] flex-col px-4 py-2 text-base text-ink2">
            {LINKS.map(([label, href]) => <li key={label} className="border-b border-rule last:border-0 [&>*]:flex [&>*]:min-h-[48px] [&>*]:items-center">{item(label, href, () => setOpen(false))}</li>)}
            <li className="py-3 sm:hidden">{wallet}</li>
          </ul>
        </div>
      )}
    </header>
  )
}
