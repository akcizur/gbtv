# NOVA Media Center

Minimalistický Web TV Player / Media Center with an iOS-inspired Liquid Glass interface.

## Current scope — 0.2.1

- Home dashboard, Live TV, EPG, Movies, Series, Library, Search and Settings.
- Keyboard and TV remote navigation with visible focus states.
- Remembered preferences, playlist and favorites; HLS quality preference (Auto / 720p / 1080p / 4K).
- M3U / M3U8 file import. HTTP(S) stream URLs are parsed from `#EXTINF` entries.
- HLS playback through `hls.js`, with native HLS fallback for browsers that support it.
- XMLTV file import, matched to playlist channels by `tvg-id`.
- Local persistence for playlist, EPG, favorites and preferences.
- Clearly marked demo channels when no real stream is configured.

## Requirements

- Node.js 20.19+ or 22.12+.
- npm.
- A modern browser with Media Source Extensions or native HLS support.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Connecting IPTV

1. Open **Settings → IPTV playlist M3U**.
2. Import a local `.m3u` or `.m3u8` playlist.
3. Select a channel in Live TV and press Play.
4. For programme metadata, import an XMLTV `.xml` file. The XMLTV `<programme channel="…">` ID must match the playlist entry's `tvg-id`.

Only absolute HTTP(S) media URLs are imported; relative playlist paths are intentionally rejected because a locally imported M3U file has no reliable remote base URL. Browser playback also depends on the stream host allowing cross-origin requests (CORS), the stream codec, browser support and valid authorization. DRM, RTSP/UDP sources and proprietary IPTV middleware are not implemented.

## Important notes

- The included catalogue and default channels are demonstration data, not real broadcasts.
- M3U playlists and XMLTV data are stored in the current browser's local storage. They are not uploaded to a server.
- Imported source URLs may contain private tokens. Do not use a shared device profile for sensitive playlist URLs.
- Movies and series are catalogue-only placeholders in this version; VOD source integration is a separate step.
- Subtitle and alternate-audio selection depend on track availability and are not yet wired to a dedicated selection menu.

## Project structure

```text
src/
├── data/catalog.ts
├── player/HlsVideo.tsx
├── services/playlist.ts
├── services/xmltv.ts
├── styles/main.scss
├── App.tsx
└── main.tsx
```
