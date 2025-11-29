# Post-It Canvas

An infinite canvas post-it note app with a retro pixel-art aesthetic inspired by early Macintosh/Amiga interfaces.

![Retro pixel-art style](https://img.shields.io/badge/style-retro%20pixel--art-7a9e9e)
![Bun runtime](https://img.shields.io/badge/runtime-Bun-f472b6)
![SQLite database](https://img.shields.io/badge/database-SQLite-003B57)

## Features

- **Infinite Canvas** - Pan and zoom to organize notes however you like
- **Resizable Notes** - Drag the corner to resize
- **Layer Ordering** - Right-click to bring notes forward or send backward
- **Image Paste** - Paste images directly, auto-dithered with Bayer algorithm for retro look
- **Strikethrough** - Use `~~text~~` to cross out completed items
- **6 Color Palette** - Cream, Sky, Rose, Mint, Peach, Lilac
- **Agent API** - POST to `/post-it` to create notes programmatically
- **Zero Dependencies** - Just Bun

## Quick Start

```bash
# Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash

# Clone and run
git clone https://github.com/user/post-it.git
cd post-it
bun install
bun run dev
```

Open http://localhost:3456

## Usage

| Action | How |
|--------|-----|
| Create note | Click `+` button |
| Edit note | Double-click or right-click > Edit |
| Delete note | Right-click > Delete |
| Move note | Drag the header |
| Resize note | Drag bottom-right corner |
| Layer order | Right-click > Bring to Front / Send to Back |
| Pan canvas | Click and drag empty space |
| Zoom | Scroll wheel or zoom buttons |
| Paste image | Ctrl+V in editor (auto-dithered) |
| Strikethrough | Wrap text in `~~tildes~~` |

## API

Create notes programmatically:

```bash
curl -X POST http://localhost:3456/post-it \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from API!", "color": "#a0c8e8"}'
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes |
| POST | `/api/notes` | Create note |
| POST | `/post-it` | Create note (alias) |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |

### Note Schema

```json
{
  "content": "Note text with ~~strikethrough~~ support",
  "color": "#e8e4a0",
  "x": 100,
  "y": 200,
  "width": 280,
  "height": 180
}
```

## Color Palette

| Color | Hex |
|-------|-----|
| Cream | `#e8e4a0` |
| Sky | `#a0c8e8` |
| Rose | `#e8a0a0` |
| Mint | `#a0e8b0` |
| Peach | `#e8c8a0` |
| Lilac | `#c8a0e8` |

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Database**: SQLite (via `bun:sqlite`)
- **Frontend**: Vanilla JS, CSS
- **Fonts**: VT323, IBM Plex Mono

## Project Structure

```
post-it/
├── src/
│   ├── server.ts    # HTTP server + API routes
│   ├── db.ts        # SQLite database
│   └── types.ts     # TypeScript types
├── public/
│   ├── index.html   # App shell
│   ├── style.css    # Retro styling
│   └── app.js       # Canvas + notes logic
├── data/
│   └── posts.db     # SQLite database (auto-created)
└── package.json
```

## Development

```bash
bun run dev    # Watch mode with hot reload
bun run start  # Production mode
```

## Deploying Behind a Reverse Proxy

This app uses **relative paths** so it works behind reverse proxies out of the box.

Example with Distiller proxy:
```
Local:  http://localhost:3456
Public: https://subdomain.devices.pamir.ai/distiller/proxy/3456/
```

## License

MIT
