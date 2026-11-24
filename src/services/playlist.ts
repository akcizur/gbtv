import type { Channel } from '../data/catalog'

type ExtInf = {
  id?: string
  name?: string
  logo?: string
  group?: string
  title?: string
}

const attribute = (line: string, name: string) => {
  const match = line.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i'))
  return match?.[1]?.trim() ?? ''
}

const slug = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 36) || 'channel'

/** Parse an M3U/M3U8 playlist into browser-playable HTTP(S) channels. */
export function parseM3U(input: string): Channel[] {
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim())
  const result: Channel[] = []
  let pending: ExtInf | null = null

  for (const line of lines) {
    if (!line) continue
    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',')
      pending = {
        id: attribute(line, 'tvg-id'),
        name: attribute(line, 'tvg-name'),
        logo: attribute(line, 'tvg-logo'),
        group: attribute(line, 'group-title'),
        title: comma >= 0 ? line.slice(comma + 1).trim() : '',
      }
      continue
    }
    if (line.startsWith('#')) continue
    if (!pending) continue

    let url: URL
    try {
      url = new URL(line)
    } catch {
      pending = null
      continue
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      pending = null
      continue
    }

    const name = pending.name || pending.title || `Kanál ${result.length + 1}`
    result.push({
      id: `iptv-${result.length + 1}-${slug(pending.id || name)}`,
      number: String(result.length + 1).padStart(2, '0'),
      name,
      category: pending.group || 'Nezařazeno',
      logo: name.slice(0, 2).toUpperCase(),
      logoUrl: pending.logo || undefined,
      tvgId: pending.id || undefined,
      current: 'EPG není dostupné',
      next: 'Program není dostupný',
      start: '--:--',
      end: '--:--',
      progress: 0,
      streamUrl: url.href,
      source: 'playlist',
    })
    pending = null
  }

  return result
}
