export type MediaItem = {
  id: string
  title: string
  type: 'Film' | 'Seriál' | 'Dokument' 
  year: number
  duration: string
  rating: string
  genre: string
  description: string
  image: string
  backdrop: string
  progress?: number
  episodes?: string
}

export const movies: MediaItem[] = [
  {
    id: 'northline', title: 'Northline', type: 'Film', year: 2025, duration: '2 h 08 min', rating: '8.4', genre: 'Sci-fi · Thriller',
    description: 'Na okraji známého světa zachytí osamělá výzkumná stanice signál, který přichází z míst, kam se lidstvo nikdy nedostalo.',
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=700&h=1000&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1800&h=1000&fit=crop', progress: 68,
  },
  {
    id: 'afterglow', title: 'Afterglow', type: 'Film', year: 2024, duration: '1 h 54 min', rating: '7.9', genre: 'Drama · Mystery',
    description: 'Jeden letní večer, dvě cesty domů a město, které si pamatuje víc, než by mělo.',
    image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=700&h=1000&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1800&h=1000&fit=crop', progress: 22,
  },
  {
    id: 'the-last-orbit', title: 'The Last Orbit', type: 'Film', year: 2025, duration: '2 h 21 min', rating: '8.7', genre: 'Sci-fi · Adventure',
    description: 'Poslední posádka na oběžné dráze musí rozhodnout, jestli se vrátí domů, nebo dokončí misi, která změnila jejich životy.',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=700&h=1000&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1800&h=1000&fit=crop',
  },
  {
    id: 'blue-hour', title: 'Blue Hour', type: 'Film', year: 2023, duration: '1 h 47 min', rating: '7.6', genre: 'Drama',
    description: 'Fotograf se vrací do rodného města, aby uzavřel příběh, který nikdy nepovažoval za dokončený.',
    image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=700&h=1000&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1800&h=1000&fit=crop',
  },
  {
    id: 'wild-earth', title: 'Wild Earth', type: 'Dokument', year: 2025, duration: '52 min', rating: '9.1', genre: 'Příroda · Dokument',
    description: 'Velkolepá cesta do míst, kde příroda stále určuje vlastní pravidla.',
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=700&h=1000&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1800&h=1000&fit=crop',
  },
  {
    id: 'mono-city', title: 'Mono City', type: 'Seriál', year: 2024, duration: '8 epizod', rating: '8.2', genre: 'Krimi · Drama',
    description: 'Město má mnoho tváří. Každá z nich skrývá vlastní pravdu.',
    image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=700&h=1000&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1800&h=1000&fit=crop', episodes: 'Série 1 · 8 epizod',
  },
  {
    id: 'deep-current', title: 'Deep Current', type: 'Seriál', year: 2025, duration: '6 epizod', rating: '8.5', genre: 'Thriller · Mystery',
    description: 'Po zmizení výzkumné lodi začíná vyšetřování, které vede hlouběji, než kdokoliv čekal.',
    image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=700&h=1000&fit=crop',
    backdrop: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1800&h=1000&fit=crop', episodes: 'Série 1 · 6 epizod',
  },
]

export type Channel = {
  id: string
  number: string
  name: string
  category: string
  logo: string
  current: string
  next: string
  start: string
  end: string
  progress: number
  logoUrl?: string
  tvgId?: string
  streamUrl?: string
  source?: 'demo' | 'playlist'
}

export const channels: Channel[] = [
  { id: 'one', number: '01', name: 'ONE', category: 'General', logo: 'O', current: 'Zprávy v 19:00', next: 'Večerní revue', start: '19:00', end: '19:45', progress: 72 },
  { id: 'cinema', number: '02', name: 'CINEMA+', category: 'Movies', logo: 'C+', current: 'The Silent Sea', next: 'After the Light', start: '18:40', end: '20:25', progress: 44 },
  { id: 'world', number: '03', name: 'WORLD', category: 'Documentary', logo: 'W', current: 'Planet Earth: Coastlines', next: 'Blue Planet', start: '19:10', end: '20:00', progress: 61 },
  { id: 'sport', number: '04', name: 'SPORT 24', category: 'Sport', logo: '24', current: 'Live: Champions League', next: 'Studio Night', start: '18:30', end: '20:30', progress: 83 },
  { id: 'music', number: '05', name: 'MUSIC', category: 'Music', logo: 'M', current: 'Live Sessions', next: 'Midnight Mix', start: '19:30', end: '20:15', progress: 28 },
  { id: 'culture', number: '06', name: 'CULTURE', category: 'Culture', logo: 'C', current: 'Architecture Now', next: 'The Art Room', start: '19:00', end: '20:00', progress: 55 },
]

export type Program = { channelId: string; time: string; title: string; duration: number; category: string; startTimestamp?: number; endTimestamp?: number }
export const programs: Program[] = [
  { channelId: 'one', time: '18:00', title: 'Den v obrazech', duration: 60, category: 'News' },
  { channelId: 'one', time: '19:00', title: 'Zprávy v 19:00', duration: 45, category: 'News' },
  { channelId: 'one', time: '19:45', title: 'Večerní revue', duration: 75, category: 'Show' },
  { channelId: 'one', time: '21:00', title: 'Noční linka', duration: 60, category: 'Talk' },
  { channelId: 'cinema', time: '18:40', title: 'The Silent Sea', duration: 105, category: 'Movie' },
  { channelId: 'cinema', time: '20:25', title: 'After the Light', duration: 110, category: 'Movie' },
  { channelId: 'cinema', time: '22:15', title: 'Cinema Stories', duration: 45, category: 'Culture' },
  { channelId: 'world', time: '18:10', title: 'Hidden Rivers', duration: 60, category: 'Documentary' },
  { channelId: 'world', time: '19:10', title: 'Planet Earth: Coastlines', duration: 50, category: 'Documentary' },
  { channelId: 'world', time: '20:00', title: 'Blue Planet', duration: 60, category: 'Documentary' },
  { channelId: 'sport', time: '18:30', title: 'Champions League · Live', duration: 120, category: 'Sport' },
  { channelId: 'sport', time: '20:30', title: 'Studio Night', duration: 60, category: 'Sport' },
  { channelId: 'music', time: '18:30', title: 'Soundcheck', duration: 60, category: 'Music' },
  { channelId: 'music', time: '19:30', title: 'Live Sessions', duration: 45, category: 'Music' },
  { channelId: 'music', time: '20:15', title: 'Midnight Mix', duration: 90, category: 'Music' },
  { channelId: 'culture', time: '18:00', title: 'Design Stories', duration: 60, category: 'Culture' },
  { channelId: 'culture', time: '19:00', title: 'Architecture Now', duration: 60, category: 'Culture' },
  { channelId: 'culture', time: '20:00', title: 'The Art Room', duration: 60, category: 'Culture' },
]

export const imageFallback = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=700&fit=crop'
