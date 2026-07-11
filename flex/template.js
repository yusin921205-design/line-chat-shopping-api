import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const base = path.dirname(fileURLToPath(import.meta.url));
export function template(name, vars) {
  const source = fs.readFileSync(path.join(base, 'templates', `${name}.json`), 'utf8');
  return JSON.parse(source.replace(/\{\{(\w+)\}\}/g, (_all, key) => String(vars[key] ?? '')));
}
