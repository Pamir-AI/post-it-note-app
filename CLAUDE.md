# Post-It Canvas

Infinite canvas post-it note app with retro pixel-art aesthetic.

## Quick Start

```bash
bun install
bun run dev    # Development with hot reload
bun run start  # Production
```

- **Local**: http://localhost:3456

## Architecture

```
src/
├── server.ts    # Bun.serve() HTTP server + API routes
├── db.ts        # SQLite database (bun:sqlite)
└── types.ts     # TypeScript types
public/
├── index.html   # App shell
├── style.css    # Retro pixel-art styling
└── app.js       # Canvas + note management
data/
└── posts.db     # SQLite database file (auto-created)
```

## Features

- **Infinite canvas** with pan/zoom
- **Resizable notes** - drag bottom-right corner
- **Layer ordering** - right-click > Bring to Front/Send to Back
- **Image paste** with auto Bayer dithering (retro halftone effect)
- **Strikethrough** - use `~~text~~` syntax
- **Right-click menu** - Edit, Delete, layer controls

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes |
| POST | `/api/notes` | Create note |
| POST | `/post-it` | Create note (agent alias) |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |

### Agent API Example

```bash
curl -X POST http://localhost:3456/post-it \
  -H "Content-Type: application/json" \
  -d '{"content": "Note from agent", "color": "#a0c8e8"}'
```

## Note Colors (Retro Palette)

| Color | Hex |
|-------|-----|
| Cream | `#e8e4a0` |
| Sky | `#a0c8e8` |
| Rose | `#e8a0a0` |
| Mint | `#a0e8b0` |
| Peach | `#e8c8a0` |
| Lilac | `#c8a0e8` |

## Proxy Compatibility

All paths are **relative** (not absolute) to work behind reverse proxies.

---

## Development Notes

- Uses Bun runtime (not Node.js)
- SQLite via `bun:sqlite`
- No external dependencies besides Bun
