import { getAllNotes, getNoteById, createNote, updateNote, deleteNote } from './db';
import type { CreateNoteInput, UpdateNoteInput } from './types';

const PORT = 3456;

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// JSON response helper
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Serve static files from public directory
async function serveStatic(path: string): Promise<Response> {
  const filePath = `./public${path === '/' ? '/index.html' : path}`;
  const file = Bun.file(filePath);

  if (await file.exists()) {
    const contentType = getContentType(filePath);
    return new Response(file, {
      headers: { 'Content-Type': contentType },
    });
  }

  // Fallback to index.html for SPA routing
  const indexFile = Bun.file('./public/index.html');
  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new Response('Not Found', { status: 404 });
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
  };
  return types[ext || ''] || 'application/octet-stream';
}

// Request handler
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // API Routes
  if (path.startsWith('/api/') || path === '/post-it') {
    try {
      // GET /api/notes - List all notes
      if (path === '/api/notes' && method === 'GET') {
        const notes = getAllNotes();
        return json(notes);
      }

      // POST /api/notes or /post-it - Create a note
      if ((path === '/api/notes' || path === '/post-it') && method === 'POST') {
        const body = await req.json() as CreateNoteInput;
        if (!body.content) {
          return json({ error: 'Content is required' }, 400);
        }
        const note = createNote(body);
        return json(note, 201);
      }

      // GET /api/notes/:id - Get single note
      const getMatch = path.match(/^\/api\/notes\/(\d+)$/);
      if (getMatch && method === 'GET') {
        const id = parseInt(getMatch[1], 10);
        const note = getNoteById(id);
        if (!note) {
          return json({ error: 'Note not found' }, 404);
        }
        return json(note);
      }

      // PUT /api/notes/:id - Update note
      const putMatch = path.match(/^\/api\/notes\/(\d+)$/);
      if (putMatch && method === 'PUT') {
        const id = parseInt(putMatch[1], 10);
        const body = await req.json() as UpdateNoteInput;
        const note = updateNote(id, body);
        if (!note) {
          return json({ error: 'Note not found' }, 404);
        }
        return json(note);
      }

      // DELETE /api/notes/:id - Delete note
      const deleteMatch = path.match(/^\/api\/notes\/(\d+)$/);
      if (deleteMatch && method === 'DELETE') {
        const id = parseInt(deleteMatch[1], 10);
        const deleted = deleteNote(id);
        if (!deleted) {
          return json({ error: 'Note not found' }, 404);
        }
        return json({ success: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('API Error:', error);
      return json({ error: 'Internal server error' }, 500);
    }
  }

  // Serve static files
  return serveStatic(path);
}

// Start server
const server = Bun.serve({
  port: PORT,
  fetch: handler,
});

console.log(`Post-It server running at http://localhost:${PORT}`);
