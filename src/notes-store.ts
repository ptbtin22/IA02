export interface Note {
  title: string;
  content: string;
  createdAt: string;
}

const notesMap = new Map<string, Note>();

/**
 * Save a new note or update an existing one
 */
export function saveNote(title: string, content: string): Note {
  const note: Note = {
    title: title.trim(),
    content,
    createdAt: new Date().toISOString(),
  };
  notesMap.set(title.trim().toLowerCase(), note);
  return note;
}

/**
 * Read a note by title
 */
export function readNote(title: string): Note | null {
  return notesMap.get(title.trim().toLowerCase()) || null;
}

/**
 * List all saved notes
 */
export function listNotes(): string {
  if (notesMap.size === 0) {
    return "No notes saved yet.";
  }
  return Array.from(notesMap.values())
    .map((n) => `- [${n.title}] (${n.createdAt.slice(0, 10)}): ${n.content}`)
    .join("\n");
}

/**
 * Format all notes for resource notes://all
 */
export function formatNotesResource(): string {
  return Array.from(notesMap.values())
    .map((n) => `# ${n.title}\n${n.content}\n`)
    .join("\n---\n");
}
