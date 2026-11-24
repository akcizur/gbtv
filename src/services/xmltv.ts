import type { Channel, Program } from '../data/catalog'

type TimedProgram = Program & { startTimestamp: number; endTimestamp: number }

function parseXmltvDate(value: string): number | null {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-])(\d{2})(\d{2}))?$/)
  if (!match) return null
  const [, y, mo, d, h, mi, s, sign, offsetHours, offsetMinutes] = match
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  if (!sign || !offsetHours || !offsetMinutes) return utc
  const offset = (Number(offsetHours) * 60 + Number(offsetMinutes)) * 60_000
  return utc - (sign === '+' ? offset : -offset)
}

const clock = (timestamp: number) => new Intl.DateTimeFormat('cs-CZ', {
  hour: '2-digit', minute: '2-digit',
}).format(new Date(timestamp))

/** Parse XMLTV programmes and bind them to imported channels using tvg-id. */
export function parseXMLTV(input: string, channels: Channel[], now = Date.now()): TimedProgram[] {
  const document = new DOMParser().parseFromString(input, 'application/xml')
  if (document.querySelector('parsererror')) throw new Error('XMLTV soubor není platné XML.')

  const channelByXmlId = new Map<string, Channel>()
  for (const channel of channels) {
    channelByXmlId.set(channel.tvgId || channel.id, channel)
  }

  return Array.from(document.querySelectorAll('programme')).flatMap(node => {
    const xmlChannelId = node.getAttribute('channel') || ''
    const channel = channelByXmlId.get(xmlChannelId)
    if (!channel) return []

    const start = parseXmltvDate(node.getAttribute('start') || '')
    const end = parseXmltvDate(node.getAttribute('stop') || '')
    const title = node.querySelector('title')?.textContent?.trim()
    if (!start || !end || end <= start || !title) return []
    if (end < now - 60 * 60_000 || start > now + 24 * 60 * 60_000) return []

    return [{
      channelId: channel.id,
      time: clock(start),
      title,
      duration: Math.round((end - start) / 60_000),
      category: node.querySelector('category')?.textContent?.trim() || 'Pořad',
      startTimestamp: start,
      endTimestamp: end,
    }]
  }).sort((a, b) => a.startTimestamp - b.startTimestamp)
}

export function applyXMLTV(channels: Channel[], programmes: TimedProgram[], now = Date.now()): Channel[] {
  return channels.map(channel => {
    const channelPrograms = programmes.filter(program => program.channelId === channel.id)
    const currentIndex = channelPrograms.findIndex(program => program.startTimestamp <= now && program.endTimestamp > now)
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : channelPrograms.findIndex(program => program.startTimestamp > now)
    const current = currentIndex >= 0 ? channelPrograms[currentIndex] : channelPrograms[nextIndex]
    const next = currentIndex >= 0 ? channelPrograms[nextIndex] : channelPrograms[nextIndex + 1]
    if (!current) return channel

    const progress = current.endTimestamp > current.startTimestamp
      ? Math.min(100, Math.max(0, ((now - current.startTimestamp) / (current.endTimestamp - current.startTimestamp)) * 100))
      : 0

    return {
      ...channel,
      current: current.title,
      next: next?.title || 'Další pořad není dostupný',
      start: clock(current.startTimestamp),
      end: clock(current.endTimestamp),
      progress: Math.round(progress),
    }
  })
}
