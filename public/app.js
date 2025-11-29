// State
let notes = [];
let selectedColor = '#e8e4a0';
let editingNoteId = null;

// Canvas transform state
let panX = 0;
let panY = 0;
let scale = 1;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

// Drag state
let isPanning = false;
let isDraggingNote = false;
let dragStartX = 0;
let dragStartY = 0;
let dragNoteId = null;
let dragNoteStartX = 0;
let dragNoteStartY = 0;

// Resize state
let isResizing = false;
let resizeNoteId = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

// DOM elements
const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const addNoteBtn = document.getElementById('add-note');
const colorPalette = document.getElementById('color-palette');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const zoomLevel = document.getElementById('zoom-level');
const editModal = document.getElementById('edit-modal');
const modalClose = document.getElementById('modal-close');
const noteContentInput = document.getElementById('note-content');
const saveNoteBtn = document.getElementById('save-note');
const deleteNoteBtn = document.getElementById('delete-note');

// API functions
async function fetchNotes() {
  const res = await fetch('api/notes');
  notes = await res.json();
  renderNotes();
}

async function createNoteAPI(data) {
  const res = await fetch('api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function updateNoteAPI(id, data) {
  const res = await fetch(`api/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deleteNoteAPI(id) {
  await fetch(`api/notes/${id}`, { method: 'DELETE' });
}

// Render functions
function renderNotes() {
  canvas.innerHTML = '';
  notes.forEach(note => {
    const el = createNoteElement(note);
    canvas.appendChild(el);
  });
}

function createNoteElement(note) {
  const el = document.createElement('div');
  el.className = 'note';
  el.dataset.id = note.id;
  el.style.left = `${note.x}px`;
  el.style.top = `${note.y}px`;
  el.style.width = `${note.width || 280}px`;
  el.style.minHeight = `${note.height || 180}px`;
  el.style.zIndex = note.z_index || 0;
  el.style.background = note.color;

  // Parse UTC timestamp and display in local timezone
  const createdDate = new Date(note.created_at + 'Z').toLocaleDateString();
  const updatedDate = new Date(note.updated_at + 'Z').toLocaleString();

  el.innerHTML = `
    <div class="note-header">
      <span class="note-date">${createdDate}</span>
      <div class="note-drag-handle">:::</div>
    </div>
    <div class="note-content">${renderContent(note.content)}</div>
    <div class="note-footer">
      <span>edited: ${updatedDate}</span>
    </div>
    <div class="resize-handle"></div>
  `;

  // Event listeners
  const header = el.querySelector('.note-header');
  header.addEventListener('mousedown', (e) => startDragNote(e, note));

  // Double-click to edit
  el.querySelector('.note-content').addEventListener('dblclick', () => openEditModal(note));

  // Resize handle
  el.querySelector('.resize-handle').addEventListener('mousedown', (e) => startResize(e, note));

  // Context menu for all actions
  el.addEventListener('contextmenu', (e) => showContextMenu(e, note));

  return el;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render content with image and formatting support
function renderContent(content) {
  // First escape HTML
  let html = escapeHtml(content);

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Replace image placeholders with actual img tags
  // Format: [IMG:data:image/...]
  html = html.replace(/\[IMG:(data:image\/[^\]]+)\]/g, (match, dataUrl) => {
    return `<img src="${dataUrl}" class="note-image" alt="pasted image">`;
  });

  return html;
}

// Dithering - Bayer ordered dithering with expanded retro palette
const DITHER_PALETTE = [
  // Original note colors
  [232, 228, 160], // Cream
  [160, 200, 232], // Sky
  [232, 160, 160], // Rose
  [160, 232, 176], // Mint
  [232, 200, 160], // Peach
  [200, 160, 232], // Lilac
  // UI colors
  [26, 42, 42],    // Dark (border color)
  [122, 158, 158], // Background
  [240, 240, 232], // Light
  // Grayscale for smooth gradients
  [0, 0, 0],       // Black
  [32, 32, 32],
  [64, 64, 64],
  [96, 96, 96],
  [128, 128, 128],
  [160, 160, 160],
  [192, 192, 192],
  [224, 224, 224],
  [255, 255, 255], // White
  // Skin tones and photo-friendly colors
  [200, 160, 140],
  [180, 130, 110],
  [140, 100, 80],
  [100, 70, 50],
  // Additional muted tones
  [180, 180, 160],
  [160, 140, 120],
  [140, 160, 140],
  [120, 140, 160],
];

// 8x8 Bayer matrix for ordered dithering
const BAYER_8x8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

function findClosestColor(r, g, b) {
  let minDist = Infinity;
  let closest = DITHER_PALETTE[0];

  for (const [pr, pg, pb] of DITHER_PALETTE) {
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < minDist) {
      minDist = dist;
      closest = [pr, pg, pb];
    }
  }
  return closest;
}

// Bayer ordered dithering - classic retro halftone pattern
function ditherImage(imageData, width, height) {
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // Get Bayer threshold and normalize to -32..+32 range
      const threshold = (BAYER_8x8[y % 8][x % 8] / 64 - 0.5) * 64;

      // Apply threshold to each channel
      const r = Math.max(0, Math.min(255, data[i] + threshold));
      const g = Math.max(0, Math.min(255, data[i + 1] + threshold));
      const b = Math.max(0, Math.min(255, data[i + 2] + threshold));

      // Find closest palette color
      const [newR, newG, newB] = findClosestColor(r, g, b);

      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
    }
  }

  return imageData;
}

async function processImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        // Scale down for pixel effect (max 450px wide for better detail)
        const maxWidth = 450;
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.floor(img.width * scale);
        const height = Math.floor(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw scaled image
        ctx.drawImage(img, 0, 0, width, height);

        // Apply dithering
        const imageData = ctx.getImageData(0, 0, width, height);
        ditherImage(imageData, width, height);
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

// Handle paste event for images in contenteditable
async function handlePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        const dataUrl = await processImage(file);
        // Insert actual image element at cursor
        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'editor-preview-image';
        img.setAttribute('data-image-marker', 'true');

        // Insert at cursor position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          // Move cursor after image
          range.setStartAfter(img);
          range.setEndAfter(img);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          noteContentInput.appendChild(img);
        }
      }
      break;
    }
  }
}

// Get content from contenteditable - convert images to [IMG:...] format
function getEditorContent() {
  const clone = noteContentInput.cloneNode(true);
  // Replace img elements with [IMG:dataUrl] text
  clone.querySelectorAll('img').forEach(img => {
    const marker = document.createTextNode(`[IMG:${img.src}]`);
    img.replaceWith(marker);
  });
  return clone.textContent || '';
}

// Set content in contenteditable - convert [IMG:...] to actual images
function setEditorContent(text) {
  // Escape HTML first
  let html = escapeHtml(text);
  // Replace [IMG:...] with actual img elements
  html = html.replace(/\[IMG:(data:image\/[^\]]+)\]/g, (_, dataUrl) => {
    return `<img src="${dataUrl}" class="editor-preview-image" data-image-marker="true">`;
  });
  noteContentInput.innerHTML = html;
}

// Canvas transform
function updateCanvasTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  zoomLevel.textContent = `${Math.round(scale * 100)}%`;
}

// Get canvas position from screen position
function screenToCanvas(screenX, screenY) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (screenX - rect.left - panX) / scale,
    y: (screenY - rect.top - panY) / scale,
  };
}

// Get center of viewport in canvas coordinates
function getViewportCenter() {
  const rect = viewport.getBoundingClientRect();
  return screenToCanvas(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );
}

// Pan handlers
function startPan(e) {
  if (e.target !== viewport && e.target !== canvas) return;
  isPanning = true;
  dragStartX = e.clientX - panX;
  dragStartY = e.clientY - panY;
  viewport.classList.add('grabbing');
}

function doPan(e) {
  if (!isPanning) return;
  panX = e.clientX - dragStartX;
  panY = e.clientY - dragStartY;
  updateCanvasTransform();
}

function endPan() {
  isPanning = false;
  viewport.classList.remove('grabbing');
}

// Note drag handlers
function startDragNote(e, note) {
  e.stopPropagation();
  isDraggingNote = true;
  dragNoteId = note.id;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragNoteStartX = note.x;
  dragNoteStartY = note.y;
}

function doDragNote(e) {
  if (!isDraggingNote) return;

  const dx = (e.clientX - dragStartX) / scale;
  const dy = (e.clientY - dragStartY) / scale;

  const noteEl = canvas.querySelector(`[data-id="${dragNoteId}"]`);
  if (noteEl) {
    noteEl.style.left = `${dragNoteStartX + dx}px`;
    noteEl.style.top = `${dragNoteStartY + dy}px`;
  }
}

async function endDragNote(e) {
  if (!isDraggingNote) return;
  isDraggingNote = false;

  const dx = (e.clientX - dragStartX) / scale;
  const dy = (e.clientY - dragStartY) / scale;

  const newX = dragNoteStartX + dx;
  const newY = dragNoteStartY + dy;

  // Update in DB
  await updateNoteAPI(dragNoteId, { x: newX, y: newY });

  // Update local state
  const note = notes.find(n => n.id === dragNoteId);
  if (note) {
    note.x = newX;
    note.y = newY;
  }

  dragNoteId = null;
}

// Resize handlers
function startResize(e, note) {
  e.stopPropagation();
  isResizing = true;
  resizeNoteId = note.id;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  resizeStartWidth = note.width || 280;
  resizeStartHeight = note.height || 180;
  document.body.style.cursor = 'nwse-resize';
}

function doResize(e) {
  if (!isResizing) return;

  const dx = (e.clientX - resizeStartX) / scale;
  const dy = (e.clientY - resizeStartY) / scale;

  const noteEl = canvas.querySelector(`[data-id="${resizeNoteId}"]`);
  if (noteEl) {
    const newWidth = Math.max(180, resizeStartWidth + dx);
    const newHeight = Math.max(120, resizeStartHeight + dy);
    noteEl.style.width = `${newWidth}px`;
    noteEl.style.minHeight = `${newHeight}px`;
  }
}

async function endResize(e) {
  if (!isResizing) return;
  isResizing = false;
  document.body.style.cursor = '';

  const dx = (e.clientX - resizeStartX) / scale;
  const dy = (e.clientY - resizeStartY) / scale;

  const newWidth = Math.max(180, resizeStartWidth + dx);
  const newHeight = Math.max(120, resizeStartHeight + dy);

  // Update in DB
  await updateNoteAPI(resizeNoteId, { width: newWidth, height: newHeight });

  // Update local state
  const note = notes.find(n => n.id === resizeNoteId);
  if (note) {
    note.width = newWidth;
    note.height = newHeight;
  }

  resizeNoteId = null;
}

// Zoom handlers
function zoom(delta, centerX, centerY) {
  const prevScale = scale;
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));

  // Adjust pan to zoom toward center point
  const scaleRatio = scale / prevScale;
  panX = centerX - (centerX - panX) * scaleRatio;
  panY = centerY - (centerY - panY) * scaleRatio;

  updateCanvasTransform();
}

function handleWheel(e) {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const centerX = e.clientX - rect.left;
  const centerY = e.clientY - rect.top;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  zoom(delta, centerX, centerY);
}

// Modal functions
function openEditModal(note) {
  editingNoteId = note ? note.id : null;
  if (note) {
    setEditorContent(note.content);
  } else {
    noteContentInput.innerHTML = '';
  }
  document.getElementById('modal-title').textContent = note ? 'EDIT_NOTE' : 'NEW_NOTE';
  deleteNoteBtn.style.display = note ? 'block' : 'none';
  editModal.classList.add('active');
  noteContentInput.focus();
}

function closeEditModal() {
  editModal.classList.remove('active');
  editingNoteId = null;
  noteContentInput.innerHTML = '';
}

async function saveNote() {
  const content = getEditorContent().trim();
  if (!content) return;

  if (editingNoteId) {
    // Update existing note
    await updateNoteAPI(editingNoteId, { content });
    const note = notes.find(n => n.id === editingNoteId);
    if (note) {
      note.content = content;
      note.updated_at = new Date().toISOString();
    }
  } else {
    // Create new note
    const center = getViewportCenter();
    const newNote = await createNoteAPI({
      content,
      color: selectedColor,
      x: center.x - 125, // Center the note
      y: center.y - 75,
    });
    notes.push(newNote);
  }

  renderNotes();
  closeEditModal();
}

async function confirmDelete(id) {
  if (confirm('Delete this note?')) {
    await deleteNoteAPI(id);
    notes = notes.filter(n => n.id !== id);
    renderNotes();
    closeEditModal();
  }
}

// Color selection
function selectColor(color) {
  selectedColor = color;
  document.querySelectorAll('.color-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color);
  });
}

// Context menu for layer ordering
let activeContextMenu = null;

function showContextMenu(e, note) {
  e.preventDefault();
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button data-action="edit">Edit</button>
    <button data-action="delete" class="danger">Delete</button>
    <div class="context-menu-divider"></div>
    <button data-action="bring-front">Bring to Front</button>
    <button data-action="bring-forward">Bring Forward</button>
    <button data-action="send-backward">Send Backward</button>
    <button data-action="send-back">Send to Back</button>
  `;
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  document.body.appendChild(menu);
  activeContextMenu = menu;

  menu.addEventListener('click', async (ev) => {
    const action = ev.target.dataset.action;
    if (action === 'edit') {
      openEditModal(note);
    } else if (action === 'delete') {
      confirmDelete(note.id);
    } else if (action) {
      await handleZIndexAction(action, note);
    }
    closeContextMenu();
  });

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true });
  }, 0);
}

function closeContextMenu() {
  if (activeContextMenu) {
    activeContextMenu.remove();
    activeContextMenu = null;
  }
}

async function handleZIndexAction(action, note) {
  const maxZ = Math.max(...notes.map(n => n.z_index || 0));
  const minZ = Math.min(...notes.map(n => n.z_index || 0));
  const currentZ = note.z_index || 0;

  let newZ;
  switch (action) {
    case 'bring-front':
      newZ = maxZ + 1;
      break;
    case 'send-back':
      newZ = minZ - 1;
      break;
    case 'bring-forward':
      newZ = currentZ + 1;
      break;
    case 'send-backward':
      newZ = currentZ - 1;
      break;
    default:
      return;
  }

  await updateNoteAPI(note.id, { z_index: newZ });
  note.z_index = newZ;
  renderNotes();
}

// Event listeners
viewport.addEventListener('mousedown', startPan);
document.addEventListener('mousemove', (e) => {
  doPan(e);
  doDragNote(e);
  doResize(e);
});
document.addEventListener('mouseup', (e) => {
  endPan();
  endDragNote(e);
  endResize(e);
});
viewport.addEventListener('wheel', handleWheel, { passive: false });

addNoteBtn.addEventListener('click', () => openEditModal(null));

colorPalette.addEventListener('click', (e) => {
  if (e.target.classList.contains('color-swatch')) {
    selectColor(e.target.dataset.color);
  }
});

zoomInBtn.addEventListener('click', () => {
  const rect = viewport.getBoundingClientRect();
  zoom(0.25, rect.width / 2, rect.height / 2);
});

zoomOutBtn.addEventListener('click', () => {
  const rect = viewport.getBoundingClientRect();
  zoom(-0.25, rect.width / 2, rect.height / 2);
});

zoomResetBtn.addEventListener('click', () => {
  scale = 1;
  panX = 0;
  panY = 0;
  updateCanvasTransform();
});

modalClose.addEventListener('click', closeEditModal);
saveNoteBtn.addEventListener('click', saveNote);
noteContentInput.addEventListener('paste', handlePaste);
deleteNoteBtn.addEventListener('click', () => {
  if (editingNoteId) confirmDelete(editingNoteId);
});

// Close modal on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editModal.classList.contains('active')) {
    closeEditModal();
  }
  // Ctrl/Cmd + Enter to save
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && editModal.classList.contains('active')) {
    saveNote();
  }
});

// Initialize
selectColor('#e8e4a0');
updateCanvasTransform();
fetchNotes();
