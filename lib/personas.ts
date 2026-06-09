/**
 * Researched demo personas (data/personas.md) — when a resident's name
 * matches one, their real-world profile is appended to the AI prompt so
 * answers sound like the actual person. Server-side only (reads fs).
 */
import { readFileSync } from "fs";
import { join } from "path";

let cache: Record<string, string> | null = null;

function load(): Record<string, string> {
  if (cache) return cache;
  cache = {};
  try {
    const md = readFileSync(join(process.cwd(), "data", "personas.md"), "utf8");
    for (const part of md.split(/^### /m).slice(1)) {
      const heading = part.split("\n")[0].trim().toLowerCase();
      // keep prompts bounded — profiles are long
      cache[heading] = part.slice(0, 5000);
    }
  } catch {
    // no personas file — prompts fall back to bio + memories only
  }
  return cache;
}

export function personaProfile(name: string): string | null {
  const profiles = load();
  const key = name.trim().toLowerCase();
  if (profiles[key]) return profiles[key];
  for (const [k, v] of Object.entries(profiles)) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return null;
}
