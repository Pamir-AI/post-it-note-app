export interface Note {
  id: number;
  content: string;
  content_type: 'text' | 'markdown' | 'html';
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  color: string;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

export interface CreateNoteInput {
  content: string;
  content_type?: 'text' | 'markdown' | 'html';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateNoteInput {
  content?: string;
  content_type?: 'text' | 'markdown' | 'html';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export const PRESET_COLORS = [
  '#ffffa5', // Classic yellow
  '#a5d6ff', // Sky blue
  '#ffa5a5', // Soft red
  '#a5ffa5', // Mint green
  '#ffd6a5', // Peach
  '#d6a5ff', // Lavender
] as const;
