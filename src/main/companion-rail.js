'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

function getUserDataPath() {
  try {
    const electron = require('electron');
    if (electron && electron.app && typeof electron.app.getPath === 'function') {
      return electron.app.getPath('userData');
    }
  } catch {}
  return process.env.APPDATA ? path.join(process.env.APPDATA, 'recon-browser') : path.join(os.tmpdir(), 'recon-browser');
}

class CompanionRailManager {
  constructor(customNotesPath = null) {
    const baseDir = getUserDataPath();
    if (!fs.existsSync(baseDir)) {
      try { fs.mkdirSync(baseDir, { recursive: true }); } catch {}
    }
    this.notesPath = customNotesPath || path.join(baseDir, 'companion_notes.json');
    this.memoryNotes = null;
  }

  loadNotes() {
    if (this.memoryNotes !== null) return this.memoryNotes;
    if (!fs.existsSync(this.notesPath)) {
      this.memoryNotes = [
        {
          id: 'note_default',
          title: 'Research & Draft Notes',
          content: '# Research & Draft Notes\n\nWelcome to the Author Desk Companion Rail. Use this split-view scratchpad to collect references, clip text from web pages, and outline your chapters side-by-side with your research.\n\n### Quick Shortcuts\n- `Ctrl+Shift+D`: Toggle Companion Rail\n- `Ctrl+Shift+E`: Append highlighted text to active note\n- `Ctrl+Shift+G`: Open Audio Grabber\n',
          tags: ['research', 'draft'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      this.saveAll(this.memoryNotes);
      return this.memoryNotes;
    }

    try {
      const data = fs.readFileSync(this.notesPath, 'utf8');
      this.memoryNotes = JSON.parse(data || '[]');
      if (!Array.isArray(this.memoryNotes) || this.memoryNotes.length === 0) {
        this.memoryNotes = [];
      }
    } catch (err) {
      console.error('[Companion Rail] Failed to parse companion_notes.json:', err);
      this.memoryNotes = [];
    }
    return this.memoryNotes;
  }

  saveAll(notes) {
    this.memoryNotes = notes;
    try {
      const tmp = `${this.notesPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(notes, null, 2), 'utf8');
      fs.renameSync(tmp, this.notesPath);
      return true;
    } catch (err) {
      console.error('[Companion Rail] Failed to save notes:', err);
      return false;
    }
  }

  getAllNotes() {
    const list = this.loadNotes();
    return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  getNote(id) {
    const list = this.loadNotes();
    return list.find(n => n.id === id) || null;
  }

  saveNote({ id, title, content, tags = [] }) {
    const list = this.loadNotes();
    const now = Date.now();
    const cleanTitle = (title || 'Untitled Note').trim();

    if (id) {
      const idx = list.findIndex(n => n.id === id);
      if (idx !== -1) {
        list[idx].title = cleanTitle;
        list[idx].content = content || '';
        list[idx].tags = Array.isArray(tags) ? tags : [];
        list[idx].updatedAt = now;
        this.saveAll(list);
        return list[idx];
      }
    }

    const newNote = {
      id: id || `note_${now}_${crypto.randomBytes(3).toString('hex')}`,
      title: cleanTitle,
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      createdAt: now,
      updatedAt: now
    };
    list.unshift(newNote);
    this.saveAll(list);
    return newNote;
  }

  deleteNote(id) {
    const list = this.loadNotes();
    const filtered = list.filter(n => n.id !== id);
    this.saveAll(filtered);
    return true;
  }

  appendSnippet(noteId, { text, sourceUrl, sourceTitle, author, date }) {
    if (!text || typeof text !== 'string') return null;
    const list = this.loadNotes();
    let note = list.find(n => n.id === noteId);
    if (!note) {
      if (list.length > 0) {
        note = list[0];
      } else {
        note = this.saveNote({ title: 'Research Excerpts', content: '# Research Excerpts\n\n' });
      }
    }

    const citationDate = date || new Date().toISOString().slice(0, 10);
    const title = sourceTitle || sourceUrl || 'Web Reference';
    const authorLine = author ? ` *by ${author}*` : '';

    const snippetMarkdown = `\n\n> ${text.trim().replace(/\n/g, '\n> ')}\n>\n> — [${title}](${sourceUrl || '#'})${authorLine} *(accessed ${citationDate})*\n`;

    note.content = (note.content || '') + snippetMarkdown;
    note.updatedAt = Date.now();
    this.saveAll(list);
    return note;
  }
}

module.exports = {
  CompanionRailManager
};
