import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Airplay, ArrowRight, AudioLines, Check, ChevronDown, ChevronRight, CircleHelp, Clapperboard,
  Command, Film, Grid2X2, Heart, Home, Info, MoreHorizontal, MonitorPlay, Pause, Play,
  Radio, Search, Settings, Share2, ShieldCheck, SkipBack, SkipForward, Sparkles,
  Subtitles, Volume2, VolumeX, X, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { channels, movies, programs, type Channel, type MediaItem, type Program } from './data/catalog'
import HlsVideo from './player/HlsVideo'
import { parseM3U } from './services/playlist'
import { applyXMLTV, parseXMLTV } from './services/xmltv'

type Page = 'home' | 'live' | 'guide' | 'movies' | 'series' | 'library' | 'search' | 'settings'
type NavItem = { id: Page; label: string; icon: LucideIcon; group?: string }

const navItems: NavItem[] = [
  { id: 'home', label: 'Domů', icon: Home, group: 'Objevovat' },
  { id: 'live', label: 'Live TV', icon: Radio },
  { id: 'guide', label: 'TV program', icon: Grid2X2 },
  { id: 'movies', label: 'Filmy', icon: Film, group: 'Knihovna' },
  { id: 'series', label: 'Seriály', icon: Clapperboard },
  { id: 'library', label: 'Moje knihovna', icon: Heart },
]

const formatTime = (date: Date) => new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit' }).format(date)
const formatDate = (date: Date) => new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long' }).format(date)
const DEFAULT_SETTINGS = { autoplay: true, ambient: true, reducedMotion: false, quality: 'Auto' }

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [channelList, setChannelList] = useState<Channel[]>(() => readStored('nova.channels', channels))
  const [activeChannelId, setActiveChannelId] = useState(() => readStored('nova.activeChannelId', channels[1].id))
  const [epgList, setEpgList] = useState<Program[]>(() => readStored('nova.epg', programs))
  const activeChannel = channelList.find(channel => channel.id === activeChannelId) ?? channelList[0] ?? channels[0]
  const setActiveChannel = (channel: Channel) => setActiveChannelId(channel.id)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(72)
  const [favorites, setFavorites] = useState<string[]>(() => readStored('nova.favorites', ['northline', 'wild-earth']))
  const [showOSD, setShowOSD] = useState(true)
  const [tvMode, setTvMode] = useState(false)
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readStored('nova.settings', DEFAULT_SETTINGS) }))
  const [notice, setNotice] = useState('')
  const hideTimer = useRef<number | undefined>(undefined)
  const noticeTimer = useRef<number | undefined>(undefined)
  const mainRef = useRef<HTMLElement | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const filtered = useMemo(() => movies.filter(item => `${item.title} ${item.genre} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [query])
  const channelMatches = useMemo(() => channelList.filter(channel => `${channel.name} ${channel.category} ${channel.current}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [channelList, query])

  const navigate = (next: Page) => {
    setSelected(null)
    setPage(next)
    setSearchOpen(false)
    setQuery('')
    window.scrollTo({ top: 0, behavior: settings.reducedMotion ? 'auto' : 'smooth' })
  }

  const notify = (message: string) => {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2800)
  }

  const importPlaylist = (text: string) => {
    const imported = parseM3U(text)
    if (!imported.length) {
      notify('Playlist neobsahuje žádné podporované HTTP(S) kanály.')
      return
    }
    setChannelList(imported)
    setActiveChannel(imported[0])
    setEpgList([])
    setPage('live')
    setPlaying(false)
    setShowOSD(true)
    notify(`Načteno ${imported.length} kanálů. Stream spustíte tlačítkem přehrávání.`)
  }

  const importEpg = (text: string) => {
    try {
      const parsed = parseXMLTV(text, channelList)
      if (!parsed.length) {
        notify('V XMLTV nebyly nalezeny pořady odpovídající ID kanálů.')
        return
      }
      setEpgList(parsed)
      setChannelList(current => applyXMLTV(current, parsed))
      notify(`Načteno ${parsed.length} pořadů z XMLTV.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'XMLTV se nepodařilo načíst.')
    }
  }

  const openPlayer = (channel = activeChannel) => {
    setActiveChannel(channel)
    setPage('live')
    setSelected(null)
    setPlaying(Boolean(channel.streamUrl) && settings.autoplay)
    setShowOSD(true)
    resetOSDTimer()
  }

  const resetOSDTimer = useCallback(() => {
    setShowOSD(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setShowOSD(false), 5200)
  }, [])

  const toggleFavorite = (id: string) => {
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const moveChannel = useCallback((direction: number) => {
    if (!channelList.length) return
    const index = channelList.findIndex(channel => channel.id === activeChannel.id)
    const safeIndex = index < 0 ? 0 : index
    const next = channelList[(safeIndex + direction + channelList.length) % channelList.length]
    setActiveChannel(next)
    setPlaying(Boolean(next.streamUrl) && settings.autoplay)
    resetOSDTimer()
  }, [activeChannel.id, channelList, resetOSDTimer])

  useEffect(() => {
    try {
      window.localStorage.setItem('nova.channels', JSON.stringify(channelList))
      window.localStorage.setItem('nova.activeChannelId', JSON.stringify(activeChannel.id))
      window.localStorage.setItem('nova.epg', JSON.stringify(epgList))
      window.localStorage.setItem('nova.favorites', JSON.stringify(favorites))
      window.localStorage.setItem('nova.settings', JSON.stringify(settings))
    } catch {
      notify('Nastavení nelze uložit do místního úložiště tohoto prohlížeče.')
    }
  }, [channelList, activeChannel.id, epgList, favorites, settings])

  useEffect(() => {
    if (!epgList.some(program => program.startTimestamp !== undefined)) return
    setChannelList(current => applyXMLTV(current, epgList as (Program & { startTimestamp: number; endTimestamp: number })[], clock.getTime()))
  }, [clock, epgList])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (searchOpen) { setSearchOpen(false); return }
        if (selected) { setSelected(null); return }
        if (page === 'live') { setPage('home'); setPlaying(false); return }
      }
      if (event.key === '/' && !searchOpen) { event.preventDefault(); setSearchOpen(true); return }
      if (event.key === 'f' && page === 'live') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); resetOSDTimer(); return }
      if (page === 'live' && !searchOpen && !selected) {
        const focusedControl = document.activeElement instanceof HTMLElement && document.activeElement.matches('button, input, select, [role=\"switch\"]')
        if (event.key === 'ArrowUp' && !focusedControl) { event.preventDefault(); moveChannel(-1); return }
        if (event.key === 'ArrowDown' && !focusedControl) { event.preventDefault(); moveChannel(1); return }
        if (event.key === ' ' && !focusedControl) { event.preventDefault(); setPlaying(value => !value); resetOSDTimer(); return }
        if (event.key.toLowerCase() === 'm') { setMuted(value => !value); resetOSDTimer(); return }
      }
      if (event.key.startsWith('Arrow') && !searchOpen && !selected) {
        setTvMode(true)
        const current = document.activeElement as HTMLElement | null
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-focusable="true"]')).filter(el => el.offsetParent !== null)
        const currentRect = current?.getBoundingClientRect()
        if (!currentRect) { candidates[0]?.focus(); return }
        const cx = currentRect.left + currentRect.width / 2
        const cy = currentRect.top + currentRect.height / 2
        const direction = event.key.replace('Arrow', '').toLowerCase()
        const possible = candidates.filter(el => el !== current).map(el => {
          const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2
          const dx = x - cx; const dy = y - cy
          const primary = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy
          const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
          return { el, primary, score: primary > 4 ? primary + secondary * 2.1 : Infinity }
        }).filter(item => Number.isFinite(item.score)).sort((a, b) => a.score - b.score)
        if (possible[0]) { event.preventDefault(); possible[0].el.focus() }
      }
    }
    const onPointer = () => setTvMode(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointermove', onPointer)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('pointermove', onPointer) }
  }, [page, searchOpen, selected, moveChannel, resetOSDTimer])

  useEffect(() => {
    if (page === 'live') {
      const onActivity = () => resetOSDTimer()
      window.addEventListener('mousemove', onActivity)
      window.addEventListener('keydown', onActivity)
      return () => { window.removeEventListener('mousemove', onActivity); window.removeEventListener('keydown', onActivity) }
    }
  }, [page, resetOSDTimer])

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); if (noticeTimer.current) window.clearTimeout(noticeTimer.current) }, [])

  const showDetail = (item: MediaItem) => setSelected(item)
  const playSelected = () => {
    if (!selected) return
    notify(selected.type === 'Seriál'
      ? 'Epizodový katalog zatím není připojen.'
      : 'VOD stream tohoto titulu zatím není připojen. Live TV lze přehrávat z M3U playlistu.')
  }

  return (
    <div className={`app-shell ${tvMode ? 'tv-mode' : ''} ${settings.reducedMotion ? 'reduce-motion' : ''} ${settings.ambient ? '' : 'ambient-off'}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Sidebar page={page} navigate={navigate} openSearch={() => setSearchOpen(true)} />
      <MobileDock page={page} navigate={navigate} />
      <div className="app-main-wrap">
        <Header page={page} openSearch={() => setSearchOpen(true)} navigate={navigate} />
        <main className={`main-content ${page === 'live' ? 'main-player' : ''}`} ref={mainRef}>
          {page === 'home' && <HomePage onSelect={showDetail} onNavigate={navigate} channels={channelList} onChooseChannel={openPlayer} favorites={favorites} toggleFavorite={toggleFavorite} />}
          {page === 'live' && <LivePage channel={activeChannel} channels={channelList} quality={settings.quality} onPlayerError={notify} onFeatureUnavailable={notify} playing={playing} setPlaying={setPlaying} muted={muted} setMuted={setMuted} volume={volume} setVolume={setVolume} showOSD={showOSD} setShowOSD={setShowOSD} resetOSDTimer={resetOSDTimer} moveChannel={moveChannel} onChannels={() => document.querySelector('.player-lower')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })} />}
          {page === 'guide' && <GuidePage activeChannel={activeChannel} channels={channelList} epg={epgList} clock={clock} onChoose={openPlayer} />}
          {page === 'movies' && <CatalogPage title="Filmy" subtitle="Příběhy, které stojí za váš čas." items={movies.filter(item => item.type !== 'Seriál')} onSelect={showDetail} favorites={favorites} toggleFavorite={toggleFavorite} />}
          {page === 'series' && <CatalogPage title="Seriály" subtitle="Další epizoda už čeká." items={movies.filter(item => item.type === 'Seriál')} onSelect={showDetail} favorites={favorites} toggleFavorite={toggleFavorite} />}
          {page === 'library' && <LibraryPage favorites={favorites} toggleFavorite={toggleFavorite} onSelect={showDetail} onNavigate={navigate} />}
          {page === 'search' && <SearchPage query={query} setQuery={setQuery} results={filtered} onSelect={showDetail} />}
          {page === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} onImportPlaylist={importPlaylist} onImportEpg={importEpg} />}
        </main>
      </div>
      {selected && <DetailModal item={selected} favorite={favorites.includes(selected.id)} onClose={() => setSelected(null)} onPlay={playSelected} onFavorite={() => toggleFavorite(selected.id)} />}
      {searchOpen && <SearchOverlay query={query} setQuery={setQuery} results={filtered} channels={channelMatches} onClose={() => setSearchOpen(false)} onSelect={item => { setSearchOpen(false); showDetail(item) }} onChooseChannel={channel => { setSearchOpen(false); openPlayer(channel) }} />}
      {notice && <div className="toast"><Check size={15} />{notice}</div>}
      <div className="keyboard-hint"><Command size={12} /> / Hledat <span>·</span> ↑↓ Navigace / kanály <span>·</span> F Celá obrazovka</div>
    </div>
  )
}

function Sidebar({ page, navigate, openSearch }: { page: Page; navigate: (page: Page) => void; openSearch: () => void }) {
  return (
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => navigate('home')} data-focusable="true" aria-label="Media Center — domů">
        <span className="brand-mark"><span /></span><span className="brand-name">NOVA<span> / MEDIA</span></span>
      </button>
      <div className="sidebar-nav">
        <span className="nav-caption">PROSTOR</span>
        {navItems.map((item, index) => (
          <div key={item.id}>
            {item.group && index > 0 && <span className="nav-caption nav-spacer">{item.group}</span>}
            {item.group && index === 0 && <span className="nav-caption nav-spacer first-caption">{item.group}</span>}
            <button className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} data-focusable="true">
              <item.icon size={18} strokeWidth={1.75} /><span>{item.label}</span>{page === item.id && <i />}
            </button>
          </div>
        ))}
      </div>
      <div className="sidebar-bottom">
        <button className="nav-link" onClick={openSearch} data-focusable="true"><Search size={18} /><span>Hledat</span><kbd>/</kbd></button>
        <button className={`nav-link ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')} data-focusable="true"><Settings size={18} /><span>Nastavení</span></button>
        <div className="profile-chip"><div className="avatar">V</div><div><strong>Váš profil</strong><small>Osobní prostor</small></div><MoreHorizontal size={17} /></div>
      </div>
    </aside>
  )
}


function MobileDock({ page, navigate }: { page: Page; navigate: (page: Page) => void }) {
  const items: { id: Page; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: 'Domů', icon: Home },
    { id: 'live', label: 'Live', icon: Radio },
    { id: 'guide', label: 'EPG', icon: Grid2X2 },
    { id: 'movies', label: 'Filmy', icon: Film },
    { id: 'library', label: 'Moje', icon: Heart },
    { id: 'settings', label: 'Nastavení', icon: Settings },
  ]
  return <nav className="mobile-dock" aria-label="Hlavní navigace">
    {items.map(item => <button key={item.id} className={`dock-item ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} data-focusable="true" aria-label={item.label}>
      <item.icon size={17} strokeWidth={1.8} />{page === item.id && <span>{item.label}</span>}
    </button>)}
  </nav>
}

function Header({ page, openSearch, navigate }: { page: Page; openSearch: () => void; navigate: (page: Page) => void }) {
  const labels: Record<Page, string> = { home: 'Přehled', live: 'Live TV', guide: 'TV program', movies: 'Filmy', series: 'Seriály', library: 'Moje knihovna', search: 'Hledat', settings: 'Nastavení' }
  return (
    <header className="topbar">
      <div className="mobile-brand"><span className="brand-mark"><span /></span><span className="brand-name">NOVA</span></div>
      <div className="breadcrumb"><span>MEDIA CENTER</span><ChevronRight size={13} /><strong>{labels[page]}</strong></div>
      <div className="topbar-actions">
        <div className="live-status"><span /> Připraveno</div>
        <button className="icon-button" aria-label="Hledat" onClick={openSearch} data-focusable="true"><Search size={18} /></button>
        <button className="icon-button" aria-label="Live TV" onClick={() => navigate('live')} data-focusable="true"><Airplay size={18} /></button>
        <button className="avatar avatar-small" aria-label="Profil" onClick={() => navigate('settings')} data-focusable="true">V</button>
      </div>
    </header>
  )
}

function HomePage({ onSelect, onNavigate, channels: channelItems, onChooseChannel, favorites, toggleFavorite }: { onSelect: (item: MediaItem) => void; onNavigate: (page: Page) => void; channels: Channel[]; onChooseChannel: (channel: Channel) => void; favorites: string[]; toggleFavorite: (id: string) => void }) {
  const featured = movies[0]
  return (
    <div className="page-stack home-page">
      <section className="hero-feature" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,9,11,.98) 0%, rgba(8,9,11,.82) 34%, rgba(8,9,11,.12) 100%), linear-gradient(0deg, #08090b 0%, transparent 35%), url(${featured.backdrop})` }}>
        <div className="hero-content">
          <div className="eyebrow"><Sparkles size={13} /> VÝBĚR EDITORA <span className="eyebrow-divider" /> NOVÝ TITUL</div>
          <h1>Beyond<br /><em>the known.</em></h1>
          <p className="hero-subtitle">{featured.title} <span>·</span> {featured.genre} <span>·</span> {featured.duration}</p>
          <p className="hero-description">{featured.description}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => onNavigate('movies')} data-focusable="true"><Clapperboard size={16} /> Prozkoumat katalog</button>
            <button className="button button-glass" onClick={() => onSelect(featured)} data-focusable="true"><Info size={16} /> Více informací</button>
            <button className={`round-button ${favorites.includes(featured.id) ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(featured.id)} data-focusable="true" aria-label="Přidat do oblíbených"><Heart size={18} fill={favorites.includes(featured.id) ? 'currentColor' : 'none'} /></button>
          </div>
          <div className="hero-footnote"><span className="content-rating">16+</span><span>Dolby Audio</span><span>4K UHD</span><span className="rating-star">★</span> {featured.rating}</div>
        </div>
        <div className="hero-pagination"><span className="pagination-active" /><span /><span /><span /></div>
        <div className="hero-index">01 <span>/</span> 04</div>
      </section>

      <section className="section-block">
        <SectionHeading title="Pokračovat ve sledování" subtitle="Vraťte se přesně tam, kde jste skončili." action="Zobrazit vše" onAction={() => onNavigate('library')} />
        <div className="continue-row">
          {movies.filter(item => item.progress).slice(0, 3).map(item => <ContinueCard key={item.id} item={item} onClick={() => onSelect(item)} />)}
        </div>
      </section>

      <section className="section-block">
        <SectionHeading title="Právě živě" subtitle="Co se právě vysílá." action="Otevřít Live TV" onAction={() => onNavigate('live')} />
        <div className="live-strip">
          {channelItems.slice(0, 4).map((channel, index) => <ChannelMiniCard key={channel.id} channel={channel} index={index} onClick={() => onChooseChannel(channel)} />)}
        </div>
      </section>

      <section className="section-block section-last">
        <SectionHeading title="Vybráno pro vás" subtitle="Nové příběhy a světy k objevování." action="Celý katalog" onAction={() => onNavigate('movies')} />
        <MediaRail items={movies.slice(1, 7)} onSelect={onSelect} favorites={favorites} toggleFavorite={toggleFavorite} />
      </section>
    </div>
  )
}

function SectionHeading({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-action" onClick={onAction} data-focusable="true">{action}<ArrowRight size={14} /></button>}</div>
}

function ContinueCard({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  return <button className="continue-card" onClick={onClick} data-focusable="true"><div className="continue-image" style={{ backgroundImage: `url(${item.backdrop})` }}><span className="continue-play"><Play size={15} fill="currentColor" /></span><span className="continue-duration">{item.duration}</span></div><div className="progress-track"><span style={{ width: `${item.progress ?? 0}%` }} /></div><div className="continue-meta"><strong>{item.title}</strong><span>{item.progress}% zhlédnuto</span></div></button>
}

function ChannelLogo({ channel, index }: { channel: Channel; index: number }) {
  return <div className={`channel-logo logo-${index}`}>
    {channel.logoUrl ? <img src={channel.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = 'none' }} /> : channel.logo}
  </div>
}

function ChannelMiniCard({ channel, index, onClick }: { channel: Channel; index: number; onClick: () => void }) {
  return <button className="channel-mini" onClick={onClick} data-focusable="true"><ChannelLogo channel={channel} index={index} /><div className="channel-mini-copy"><div className="channel-mini-top"><strong>{channel.name}</strong><span className="live-dot-label"><i /> {channel.streamUrl ? 'LIVE' : 'DEMO'}</span></div><span>{channel.current}</span><div className="mini-progress"><i style={{ width: `${channel.progress}%` }} /></div></div><ChevronRight size={16} /></button>
}

function MediaRail({ items, onSelect, favorites, toggleFavorite }: { items: MediaItem[]; onSelect: (item: MediaItem) => void; favorites: string[]; toggleFavorite: (id: string) => void }) {
  return <div className="media-rail">{items.map(item => <MediaPoster key={item.id} item={item} onSelect={onSelect} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} />)}</div>
}

function MediaPoster({ item, onSelect, favorite, onFavorite }: { item: MediaItem; onSelect: (item: MediaItem) => void; favorite: boolean; onFavorite: () => void }) {
  return <article className="poster-card"><button className="poster-art" style={{ backgroundImage: `url(${item.image})` }} onClick={() => onSelect(item)} data-focusable="true" aria-label={`Detail: ${item.title}`}><span className="poster-shade" /><span className="poster-topline">{item.type === 'Seriál' ? 'SERIES' : item.type.toUpperCase()}</span><span className="poster-hover"><Play size={17} fill="currentColor" /></span><span className="poster-rating">★ {item.rating}</span></button><div className="poster-info"><div><strong>{item.title}</strong><span>{item.year} <i>·</i> {item.genre}</span></div><button className={`poster-fav ${favorite ? 'is-favorite' : ''}`} onClick={onFavorite} data-focusable="true" aria-label="Oblíbené"><Heart size={16} fill={favorite ? 'currentColor' : 'none'} /></button></div></article>
}

function LivePage({ channel, channels: channelItems, quality, onPlayerError, onFeatureUnavailable, playing, setPlaying, muted, setMuted, volume, setVolume, showOSD, setShowOSD, resetOSDTimer, moveChannel, onChannels }: { channel: Channel; channels: Channel[]; quality: string; onPlayerError: (message: string) => void; onFeatureUnavailable: (message: string) => void; playing: boolean; setPlaying: (value: boolean | ((current: boolean) => boolean)) => void; muted: boolean; setMuted: (value: boolean | ((current: boolean) => boolean)) => void; volume: number; setVolume: (value: number) => void; showOSD: boolean; setShowOSD: (value: boolean) => void; resetOSDTimer: () => void; moveChannel: (direction: number) => void; onChannels: () => void }) {
  const [tab, setTab] = useState<'channels' | 'now'>('channels')
  return <div className="player-page page-stack" onMouseMove={resetOSDTimer}>
    <div className="player-topline"><div><span className="live-dot-label"><i /> {channel.streamUrl ? 'LIVE BROADCAST' : 'DEMO PREVIEW'}</span><span className="muted-label"> / {channel.category}</span></div><div className="player-top-actions"><span className="muted-label">{channel.streamUrl ? 'STREAM' : 'UKÁZKA'} <span className="signal-bars">▂▄▆</span></span><button className="icon-button" aria-label="Další možnosti" onClick={onChannels} data-focusable="true"><MoreHorizontal size={18} /></button></div></div>
    <div className="player-stage" onClick={() => { if (showOSD) setShowOSD(false); else resetOSDTimer() }}>
      {channel.streamUrl ? <HlsVideo src={channel.streamUrl} quality={quality} playing={playing} muted={muted} volume={volume} onPlayingChange={setPlaying} onError={onPlayerError} /> : <div className="player-backdrop" style={{ backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.94), transparent 44%), linear-gradient(90deg, rgba(0,0,0,.38), transparent 70%), url(${channel.id === 'world' ? movies[4].backdrop : channel.id === 'cinema' ? movies[0].backdrop : channel.id === 'sport' ? 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&h=900&fit=crop' : movies[1].backdrop})` }} />}
      {!channel.streamUrl && <div className="demo-stream-notice">DEMO NÁHLED <span>·</span> Připojte M3U playlist v Nastavení</div>}
      <div className="player-watermark">NOVA <span>LIVE</span></div>
      {showOSD && <>
        <div className="player-channel-ident"><ChannelLogo channel={channel} index={1} /><div><span className="channel-number">KANÁL {channel.number}</span><h2>{channel.name}</h2><p>{channel.category} · HD</p></div></div>
        <div className="player-center-controls"><button className="round-button player-skip" onClick={event => { event.stopPropagation(); moveChannel(-1) }} data-focusable="true" aria-label="Předchozí kanál"><SkipBack size={23} /></button><button className="play-large" onClick={event => { event.stopPropagation(); if (!channel.streamUrl) onFeatureUnavailable('Tento demo kanál nemá stream. Importujte vlastní M3U playlist.'); else setPlaying(!playing); resetOSDTimer() }} data-focusable="true" aria-label={!channel.streamUrl ? 'Stream není připojen' : playing ? 'Pauza' : 'Přehrát'}>{playing && channel.streamUrl ? <Pause size={25} fill="currentColor" /> : <Play size={25} fill="currentColor" />}</button><button className="round-button player-skip" onClick={event => { event.stopPropagation(); moveChannel(1) }} data-focusable="true" aria-label="Další kanál"><SkipForward size={23} /></button></div>
        <div className="player-bottom-info"><div className="program-title"><span className="on-now">NYNÍ</span><h3>{channel.current}</h3><p>Živé vysílání <span>·</span> {channel.start} – {channel.end}</p></div><div className="program-progress"><div className="program-times"><span>{channel.start}</span><span>{channel.end}</span></div><div className="progress-track"><span style={{ width: `${channel.progress}%` }} /></div><div className="next-program"><span>DALŠÍ</span><strong>{channel.next}</strong></div></div></div>
        <div className="player-controls"><button className="control-pill" onClick={event => { event.stopPropagation(); setMuted(!muted); resetOSDTimer() }} data-focusable="true">{muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}<span>{muted ? 'Ztlumeno' : 'Zvuk'}</span></button><div className="volume-control"><input aria-label="Hlasitost" type="range" min="0" max="100" value={muted ? 0 : volume} onClick={event => event.stopPropagation()} onChange={event => { setVolume(Number(event.target.value)); setMuted(false); resetOSDTimer() }} /></div><button className="control-pill" onClick={event => { event.stopPropagation(); onFeatureUnavailable('Titulky budou dostupné podle stop vložených ve streamu.'); resetOSDTimer(); }} data-focusable="true"><Subtitles size={17} /><span>Titulky</span></button><button className="control-pill" onClick={event => { event.stopPropagation(); onFeatureUnavailable('Výběr zvukové stopy bude dostupný podle možností streamu.'); resetOSDTimer(); }} data-focusable="true"><AudioLines size={17} /><span>Audio</span></button><button className="control-pill" onClick={event => { event.stopPropagation(); document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.player-stage')?.requestFullscreen?.(); }} data-focusable="true"><Airplay size={17} /><span>Celá obrazovka</span></button></div>
      </>}
      {!showOSD && <button className="player-reveal" onClick={event => { event.stopPropagation(); resetOSDTimer() }} data-focusable="true"><span><Play size={14} fill="currentColor" /></span> Zobrazit ovládání</button>}
      {channel.streamUrl && !playing && <div className="paused-indicator">PAUSED</div>}
    </div>
    <div className="player-lower"><div className="lower-tabs"><button className={tab === 'channels' ? 'active' : ''} onClick={() => setTab('channels')} data-focusable="true">Kanály <span>{channelItems.length}</span></button><button className={tab === 'now' ? 'active' : ''} onClick={() => setTab('now')} data-focusable="true">Právě vysíláno</button></div><div className="channel-browser-row">{tab === 'channels' ? channelItems.map((item, index) => <button key={item.id} className={`channel-browser-card ${item.id === channel.id ? 'selected' : ''}`} onClick={() => moveChannelTo(item, channelItems, moveChannel, channel)} data-focusable="true"><ChannelLogo channel={item} index={index} /><div><strong>{item.name}</strong><span>{item.current}</span></div>{item.id === channel.id && <i className="selected-channel-dot" />}</button>) : <div className="now-next-copy"><span>DALŠÍ NA {channel.name}</span><strong>{channel.next}</strong><small>Navazuje po skončení aktuálního pořadu.</small></div>}</div></div>
  </div>
}

function moveChannelTo(item: Channel, channelItems: Channel[], moveChannel: (direction: number) => void, current: Channel) {
  const direction = channelItems.findIndex(channel => channel.id === item.id) - channelItems.findIndex(channel => channel.id === current.id)
  moveChannel(direction)
}

function GuidePage({ activeChannel, channels: channelItems, epg, clock, onChoose }: { activeChannel: Channel; channels: Channel[]; epg: Program[]; clock: Date; onChoose: (channel: Channel) => void }) {
  const [selectedProgram, setSelectedProgram] = useState('')
  const windowStart = new Date(clock)
  windowStart.setMinutes(0, 0, 0)
  const windowEnd = windowStart.getTime() + 5 * 60 * 60_000
  const nowPercent = Math.min(100, Math.max(0, ((clock.getTime() - windowStart.getTime()) / (windowEnd - windowStart.getTime())) * 100))
  const times = Array.from({ length: 5 }, (_, index) => formatTime(new Date(windowStart.getTime() + index * 60 * 60_000)))

  return <div className="page-stack guide-page">
    <PageIntro
      eyebrow="PROGRAMOVÝ PRŮVODCE"
      title="TV program"
      description={epg.some(program => program.startTimestamp) ? 'Program načtený z XMLTV.' : 'Ukázkový rozpis. Vlastní program načtete importem XMLTV.'}
      right={<div className="date-picker"><span>DNES</span><strong>{formatDate(clock)}</strong><ChevronDown size={14} /></div>}
    />
    <div className="guide-toolbar">
      <div className="guide-live-indicator"><i /> Aktuální čas <strong>{formatTime(clock)}</strong></div>
      <div className="guide-legend"><span><i className="legend-now" /> Právě běží</span><span><i className="legend-upcoming" /> Následuje</span></div>
    </div>
    <div className="epg-grid">
      <div className="epg-header"><div className="epg-channel-head">KANÁL</div>{times.map(time => <div className="epg-time" key={time}>{time}</div>)}</div>
      {channelItems.map((channel, index) => {
        const imported = epg.filter(program => program.channelId === channel.id && program.startTimestamp && program.endTimestamp)
        const channelPrograms = imported.length ? imported : programs.filter(program => program.channelId === channel.id)
        return <div className={`epg-row ${activeChannel.id === channel.id ? 'active-row' : ''}`} key={channel.id}>
          <button className="epg-channel" onClick={() => onChoose(channel)} data-focusable="true">
            <ChannelLogo channel={channel} index={index} />
            <div><strong>{channel.name}</strong><span>{channel.number} · HD</span></div>
          </button>
          <div className="epg-programs">
            {nowPercent > 0 && nowPercent < 100 && <div className="epg-now-line" style={{ left: `${nowPercent}%` }} aria-hidden="true" />}
            {channelPrograms.length ? channelPrograms.map((program, programIndex) => {
              const [hour, minute] = program.time.split(':').map(Number)
              const fallbackStart = new Date(clock)
              fallbackStart.setHours(hour, minute, 0, 0)
              const start = program.startTimestamp ?? fallbackStart.getTime()
              const end = program.endTimestamp ?? start + program.duration * 60_000
              const clippedStart = Math.max(start, windowStart.getTime())
              const clippedEnd = Math.min(end, windowEnd)
              if (clippedEnd <= clippedStart) return null
              const left = ((clippedStart - windowStart.getTime()) / (windowEnd - windowStart.getTime())) * 100
              const width = ((clippedEnd - clippedStart) / (windowEnd - windowStart.getTime())) * 100
              const isCurrent = start <= clock.getTime() && end > clock.getTime()
              return <button
                key={`${channel.id}-${programIndex}`}
                className={`epg-program ${isCurrent ? 'epg-current' : ''}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                onClick={() => { setSelectedProgram(program.title); onChoose(channel) }}
                data-focusable="true"
                title={`${program.time} · ${program.title}`}
              >
                <span>{program.time}</span><strong>{program.title}</strong><small>{program.category}</small>
              </button>
            }) : <div className="epg-no-program">EPG není dostupné</div>}
          </div>
        </div>
      })}
    </div>
    <div className="guide-footnote"><Info size={14} /> {selectedProgram ? `Vybraný pořad: ${selectedProgram}` : 'Vyberte pořad pro přepnutí na jeho kanál.'}</div>
  </div>
}

function CatalogPage({ title, subtitle, items, onSelect, favorites, toggleFavorite }: { title: string; subtitle: string; items: MediaItem[]; onSelect: (item: MediaItem) => void; favorites: string[]; toggleFavorite: (id: string) => void }) {
  const [category, setCategory] = useState('Vše')
  const categories = ['Vše', 'Sci-fi', 'Drama', 'Thriller', 'Příroda']
  const visibleItems = category === 'Vše' ? items : items.filter(item => item.genre.toLowerCase().includes(category.toLowerCase()))
  return <div className="page-stack catalog-page"><PageIntro eyebrow="OBSAHOVÁ KNIHOVNA" title={title} description={subtitle} /><div className="catalog-toolbar"><div className="category-pills">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)} data-focusable="true">{item}</button>)}</div></div><div className="poster-grid">{visibleItems.map(item => <MediaPoster key={item.id} item={item} onSelect={onSelect} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} />)}</div>{visibleItems.length === 0 && <EmptyState title="Nic jsme nenašli" description="Zkuste jiný žánr nebo filtr." />}</div>
}

function LibraryPage({ favorites, toggleFavorite, onSelect, onNavigate }: { favorites: string[]; toggleFavorite: (id: string) => void; onSelect: (item: MediaItem) => void; onNavigate: (page: Page) => void }) {
  const saved = movies.filter(item => favorites.includes(item.id))
  const continueItems = movies.filter(item => item.progress)
  return <div className="page-stack"><PageIntro eyebrow="OSOBNÍ PROSTOR" title="Moje knihovna" description="Váš obsah, vaše tempo. Vše na jednom místě." /><section className="section-block"><SectionHeading title="Pokračovat ve sledování" subtitle="Nedokončené tituly." />{continueItems.length ? <div className="continue-row">{continueItems.map(item => <ContinueCard key={item.id} item={item} onClick={() => onSelect(item)} />)}</div> : <EmptyState title="Zatím tu nic není" description="Rozehrané pořady se objeví právě tady." />}</section><section className="section-block"><SectionHeading title="Oblíbené" subtitle={`${saved.length} uložených titulů.`} />{saved.length ? <div className="poster-grid">{saved.map(item => <MediaPoster key={item.id} item={item} onSelect={onSelect} favorite onFavorite={() => toggleFavorite(item.id)} />)}</div> : <EmptyState title="Knihovna čeká na první titul" description="Uložte si filmy a seriály pomocí ikony srdce." action="Prozkoumat filmy" onAction={() => onNavigate('movies')} />}</section></div>
}

function SearchPage({ query, setQuery, results, onSelect }: { query: string; setQuery: (value: string) => void; results: MediaItem[]; onSelect: (item: MediaItem) => void }) {
  return <div className="page-stack search-page"><PageIntro eyebrow="UNIVERZÁLNÍ VYHLEDÁVÁNÍ" title="Hledat" description="Filmy, seriály, žánry a další obsah." /><div className="search-field"><Search size={20} /><input autoFocus placeholder="Co si dnes pustíme?" value={query} onChange={event => setQuery(event.target.value)} /><kbd>ESC</kbd></div><div className="search-results-heading"><span>{query ? `${results.length} VÝSLEDKŮ` : 'DOPORUČENÉ TITULY'}</span></div><div className="poster-grid">{(query ? results : movies.slice(0, 4)).map(item => <MediaPoster key={item.id} item={item} onSelect={onSelect} favorite={false} onFavorite={() => undefined} />)}</div></div>
}

function SettingsPage({ settings, setSettings, onImportPlaylist, onImportEpg }: { settings: { autoplay: boolean; ambient: boolean; reducedMotion: boolean; quality: string }; setSettings: (value: { autoplay: boolean; ambient: boolean; reducedMotion: boolean; quality: string }) => void; onImportPlaylist: (text: string) => void; onImportEpg: (text: string) => void }) {
  const update = <K extends keyof typeof settings,>(key: K, value: (typeof settings)[K]) => setSettings({ ...settings, [key]: value })
  return <div className="page-stack settings-page"><PageIntro eyebrow="PREFERENCE" title="Nastavení" description="Přizpůsobte si prostředí podle sebe." /><div className="settings-layout"><div className="settings-group"><div className="settings-group-title"><span>VZHLED A CHOVÁNÍ</span><small>Rozhraní</small></div><SettingRow icon={Sparkles} title="Ambientní podsvícení" description="Jemná atmosféra kolem hlavního obsahu."><Toggle checked={settings.ambient} onChange={value => update('ambient', value)} /></SettingRow><SettingRow icon={Zap} title="Automatické spuštění streamu" description="Po otevření kanálu rovnou spustit přehrávání."><Toggle checked={settings.autoplay} onChange={value => update('autoplay', value)} /></SettingRow><SettingRow icon={ShieldCheck} title="Omezit animace" description="Upřednostnit méně pohybu a přechodů."><Toggle checked={settings.reducedMotion} onChange={value => update('reducedMotion', value)} /></SettingRow></div><div className="settings-group"><div className="settings-group-title"><span>PŘEHRÁVÁNÍ</span><small>Video a zvuk</small></div><SettingRow icon={MonitorPlay} title="Výchozí kvalita" description="Preferovaná kvalita streamu."><select className="setting-select" value={settings.quality} onChange={event => update('quality', event.target.value)} data-focusable="true"><option>Auto</option><option>1080p</option><option>720p</option><option>4K</option></select></SettingRow></div><div className="settings-group"><div className="settings-group-title"><span>ZDROJE A INFORMACE</span><small>Prototyp</small></div><SettingRow icon={Radio} title="IPTV playlist M3U" description="Import kanálů ze souboru M3U nebo M3U8."><ImportFileButton accept=".m3u,.m3u8,text/plain" label="Importovat M3U" onRead={onImportPlaylist} /></SettingRow><SettingRow icon={Grid2X2} title="Programový průvodce XMLTV" description="Propojení pořadů podle tvg-id kanálů."><ImportFileButton accept=".xml,.xmltv,text/xml,application/xml" label="Importovat EPG" onRead={onImportEpg} /></SettingRow><SettingRow icon={CircleHelp} title="O aplikaci" description="NOVA Media · Web TV Player 0.2.1"><span className="version-tag">v0.2.1</span></SettingRow></div></div></div>
}

function ImportFileButton({ accept, label, onRead }: { accept: string; label: string; onRead: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  return <>
    <button type="button" className="button button-glass button-small import-file-button" onClick={() => inputRef.current?.click()} data-focusable="true">{label}</button>
    <input ref={inputRef} type="file" accept={accept} hidden onChange={event => {
      const file = event.target.files?.[0]
      if (file) void file.text().then(onRead).catch(() => window.alert('Soubor se nepodařilo přečíst.'))
      event.currentTarget.value = ''
    }} />
  </>
}

function SettingRow({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: ReactNode }) {
  return <div className="setting-row"><div className="setting-icon"><Icon size={17} /></div><div className="setting-copy"><strong>{title}</strong><span>{description}</span></div><div className="setting-control">{children}</div></div>
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button className={`toggle ${checked ? 'checked' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)} data-focusable="true"><i /></button>
}

function PageIntro({ eyebrow, title, description, right }: { eyebrow: string; title: string; description: string; right?: ReactNode }) {
  return <div className="page-intro"><div><span className="eyebrow-text">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{right && <div className="page-intro-right">{right}</div>}</div>
}

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><div className="empty-orb"><Film size={22} /></div><strong>{title}</strong><p>{description}</p>{action && <button className="button button-glass button-small" onClick={onAction} data-focusable="true">{action}<ArrowRight size={14} /></button>}</div>
}

function DetailModal({ item, favorite, onClose, onPlay, onFavorite }: { item: MediaItem; favorite: boolean; onClose: () => void; onPlay: () => void; onFavorite: () => void }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="detail-modal" role="dialog" aria-modal="true" aria-label={`Detail ${item.title}`}><button className="modal-close round-button" onClick={onClose} data-focusable="true" aria-label="Zavřít"><X size={18} /></button><div className="detail-backdrop" style={{ backgroundImage: `linear-gradient(0deg, #111318 0%, rgba(17,19,24,.1) 100%), url(${item.backdrop})` }} /><div className="detail-content"><span className="eyebrow-text">{item.type.toUpperCase()} · {item.year}</span><h2>{item.title}</h2><div className="detail-metadata"><span className="rating-star">★</span> {item.rating}<i />{item.duration}<i />{item.genre}<i /><span className="content-rating">16+</span></div><p>{item.description}</p><div className="detail-actions"><button className="button button-primary" onClick={onPlay} data-focusable="true"><Play size={16} fill="currentColor" /> {item.type === 'Seriál' ? 'Zobrazit epizody' : 'Přehrát'}</button><button className={`round-button ${favorite ? 'is-favorite' : ''}`} onClick={onFavorite} data-focusable="true" aria-label="Oblíbené"><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button><button className="round-button" onClick={() => navigator.clipboard?.writeText(item.title)} data-focusable="true" aria-label="Sdílet"><Share2 size={18} /></button></div><div className="detail-extra"><div><span>KATALOG</span><strong>Ukázkový obsah</strong></div><div><span>VOD ZDROJ</span><strong>Nepřipojen</strong></div><div><span>METADATA</span><strong>Demo</strong></div></div></div></div></div>
}

function SearchOverlay({ query, setQuery, results, channels: channelResults, onClose, onSelect, onChooseChannel }: { query: string; setQuery: (value: string) => void; results: MediaItem[]; channels: Channel[]; onClose: () => void; onSelect: (item: MediaItem) => void; onChooseChannel: (channel: Channel) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  return <div className="search-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="search-modal"><div className="search-modal-top"><Search size={22} /><input ref={inputRef} placeholder="Hledat filmy, seriály, kanály…" value={query} onChange={event => setQuery(event.target.value)} /><button className="round-button" onClick={onClose} data-focusable="true" aria-label="Zavřít hledání"><X size={17} /></button></div><div className="search-modal-body">{query ? <><span className="search-kicker">VÝSLEDKY · {results.length + channelResults.length}</span>{channelResults.slice(0, 3).map(channel => <button className="search-result search-channel-result" key={channel.id} onClick={() => onChooseChannel(channel)} data-focusable="true"><span className="channel-result-logo">{channel.logo}</span><span><strong>{channel.name}</strong><small>TV kanál · {channel.category}</small></span><ArrowRight size={16} /></button>)}{results.length ? results.slice(0, 5).map(item => <button className="search-result" key={item.id} onClick={() => onSelect(item)} data-focusable="true"><img src={item.image} alt="" /><span><strong>{item.title}</strong><small>{item.year} · {item.type} · {item.genre}</small></span><ArrowRight size={16} /></button>) : channelResults.length ? null : <p className="no-search-results">Žádné výsledky. Zkuste jiný výraz.</p>}</> : <><span className="search-kicker">RYCHLÝ PŘÍSTUP</span><button className="quick-search" onClick={() => setQuery('sci-fi')} data-focusable="true"><Sparkles size={15} /> Sci-fi výběr <ArrowRight size={15} /></button><button className="quick-search" onClick={() => setQuery('dokument')} data-focusable="true"><Film size={15} /> Dokumenty <ArrowRight size={15} /></button><button className="quick-search" onClick={() => setQuery('drama')} data-focusable="true"><Clapperboard size={15} /> Drama <ArrowRight size={15} /></button></>}</div><div className="search-modal-footer"><span>↑ ↓ navigovat</span><span>↵ otevřít</span><span>ESC zavřít</span></div></div></div>
}

export default App
