import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

type HlsVideoProps = {
  src: string
  playing: boolean
  quality: string
  muted: boolean
  volume: number
  onPlayingChange: (playing: boolean) => void
  onError: (message: string) => void
  onReady?: () => void
}

export default function HlsVideo({ src, playing, quality, muted, volume, onPlayingChange, onError, onReady }: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readyRef = useRef(false)
  const hlsRef = useRef<Hls | null>(null)
  const playingRef = useRef(playing)
  const qualityRef = useRef(quality)
  const callbacks = useRef({ onPlayingChange, onError, onReady })
  playingRef.current = playing
  qualityRef.current = quality
  callbacks.current = { onPlayingChange, onError, onReady }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let engine: Hls | null = null
    let disposed = false
    let networkRetries = 0
    let mediaRetries = 0
    readyRef.current = false

    const fail = (message: string) => {
      if (disposed) return
      callbacks.current.onPlayingChange(false)
      callbacks.current.onError(message)
    }
    const markReady = () => {
      if (disposed) return
      readyRef.current = true
      if (engine) applyQuality(engine, qualityRef.current)
      callbacks.current.onReady?.()
      if (playingRef.current) void video.play().catch(() => callbacks.current.onPlayingChange(false))
    }
    const handlePlaying = () => callbacks.current.onPlayingChange(true)
    const handlePause = () => { if (!disposed) callbacks.current.onPlayingChange(false) }
    const handleVideoError = () => fail('Prohlížeč nedokázal načíst video stream. Zkontrolujte URL, CORS a dostupnost zdroje.')

    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePause)
    video.addEventListener('error', handleVideoError)

    if (Hls.isSupported()) {
      engine = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        capLevelToPlayerSize: true,
      })
      hlsRef.current = engine
      engine.loadSource(src)
      engine.attachMedia(video)
      engine.on(Hls.Events.MANIFEST_PARSED, markReady)
      engine.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || disposed) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 3) {
          networkRetries += 1
          engine?.startLoad()
          return
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 2) {
          mediaRetries += 1
          engine?.recoverMediaError()
          return
        }
        fail(`Stream se nepodařilo přehrát (${data.details}).`)
        engine?.destroy()
        engine = null
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.addEventListener('loadedmetadata', markReady, { once: true })
    } else {
      fail('Tento prohlížeč nepodporuje HLS přehrávání.')
    }

    return () => {
      disposed = true
      engine?.destroy()
      hlsRef.current = null
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('error', handleVideoError)
      video.pause()
      video.removeAttribute('src')
      video.load()
      readyRef.current = false
    }
  }, [src])

  useEffect(() => {
    applyQuality(hlsRef.current, quality)
  }, [quality])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = muted
    video.volume = Math.min(1, Math.max(0, volume / 100))
    if (playing && readyRef.current) {
      void video.play().catch(() => callbacks.current.onPlayingChange(false))
    } else if (!playing) {
      video.pause()
    }
  }, [playing, muted, volume])

  return <video ref={videoRef} className="hls-video" playsInline preload="auto" aria-label="Video přehrávač" />
}

function applyQuality(engine: Hls | null, quality: string) {
  if (!engine || !engine.levels.length) return
  if (quality === 'Auto') {
    engine.currentLevel = -1
    return
  }
  const target = quality === '4K' ? 2160 : Number.parseInt(quality, 10)
  if (!Number.isFinite(target)) return
  const candidates = engine.levels
    .map((level, index) => ({ index, height: level.height || 0 }))
    .filter(level => level.height > 0 && level.height <= target)
    .sort((a, b) => b.height - a.height)
  const fallback = engine.levels
    .map((level, index) => ({ index, height: level.height || 0 }))
    .filter(level => level.height > 0)
    .sort((a, b) => a.height - b.height)[0]
  engine.currentLevel = candidates[0]?.index ?? fallback?.index ?? -1
}
