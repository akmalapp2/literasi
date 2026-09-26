import 'server-only';
import { randomInt } from 'node:crypto';

// Tanpa karakter yang mirip (0/O, 1/I/L) agar mudah diketik dari kartu.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateToken(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function generateSlug(): string {
  return 'angket-' + generateToken(6).toLowerCase();
}
