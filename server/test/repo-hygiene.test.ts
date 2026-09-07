import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '..', '..');
const BINARY_EXT = /\.(png|jpe?g|gif|webp|woff2?|ttf|otf|eot|ico|map)$/i;

// ASCII hyphen since the character class in this file must stay escape-free.
// Actually the marker set is numeric — no literals to mangle.
const MARKER_CODEPOINTS = new Set([0xc2, 0xc3, 0xe2, 0xfffd]);

function isLikelyBinary(file: string): boolean {
  const head = readFileSync(file, 'latin1').slice(0, 8192);
  return head.includes(String.fromCharCode(0));
}

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

function hasMojibakeCodepoint(content: string): boolean {
  for (const ch of content) {
    if (MARKER_CODEPOINTS.has(ch.codePointAt(0) as number)) return true;
  }
  return false;
}

describe('repo hygiene — no UTF-8 double-encoding artifacts', () => {
  let textFiles: string[];

  beforeAll(() => {
    let raw = '';
    try {
      raw = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, encoding: 'utf8' });
    } catch {
      raw = '';
    }
    const tracked = raw.split('\0').filter(Boolean);

    const distDirs = ['dist', 'client/dist', 'server/dist'].filter((d) => existsSync(join(repoRoot, d)));
    textFiles = [...tracked, ...distDirs.reduce<string[]>((all, d) => all.concat(collectFiles(join(repoRoot, d))), [])]
      .filter((file) => !BINARY_EXT.test(file))
      .filter((file) => {
        const full = join(repoRoot, file);
        return existsSync(full) && !isLikelyBinary(full);
      });
  });

  it('has no mojibake marker characters (U+00C2, U+00C3, U+00E2, U+FFFD) in tracked source or built output', () => {
    const offenders = textFiles
      .map((file) => ({
        file,
        has: hasMojibakeCodepoint(readFileSync(join(repoRoot, file), 'utf8')),
      }))
      .filter((row) => row.has && !row.file.endsWith('package-lock.json'))
      .map((row) => row.file);

    expect(offenders).toEqual([]);
  });
});