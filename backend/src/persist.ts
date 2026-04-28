/**
 * Simple file-based persistence for in-memory stores.
 * Saves/loads JSON to backend/data/*.json so data survives restarts.
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadMap<V>(name: string): Map<string, V> {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return new Map();
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const entries: [string, V][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

export function saveMap<V>(name: string, map: Map<string, V>): void {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(Array.from(map.entries()), null, 2));
  } catch (e) {
    console.error(`Failed to persist ${name}:`, e);
  }
}
