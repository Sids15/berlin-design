#!/usr/bin/env node
/**
 * extract-frames.mjs — turn the hero footage into an evenly-spaced WebP frame
 * sequence for the scroll-scrubbed canvas hero.
 *
 * Why frames instead of scrubbing a <video>? Seeking a paused video is janky
 * and unreliable (especially iOS). Drawing a pre-decoded image to a canvas is
 * instant and identical on every device — buttery scroll scrubbing.
 *
 * Usage:
 *   node scripts/extract-frames.mjs [input.mp4]
 *
 * Output: public/videos/hero/frames/frame-0001.webp … (COUNT frames)
 * Re-run whenever the source footage changes.
 */
import { execFileSync } from "node:child_process";
import { rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

// --- Config -----------------------------------------------------------------
const INPUT = process.argv[2] ?? "media-src/hero-pour.mp4";
const OUT_DIR = "public/videos/hero/frames";
const FRAME_COUNT = 130; // more = smoother scrub + heavier payload
const WIDTH = 1600; // frame width in px (height keeps aspect)
const QUALITY = 70; // WebP quality 0–100

// --- Probe duration by parsing ffmpeg's own banner --------------------------
function probeDuration(input) {
  let stderr = "";
  try {
    execFileSync(ffmpegPath, ["-i", input], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    stderr = err.stderr?.toString() ?? ""; // ffmpeg exits non-zero with no output file
  }
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error("Could not read video duration from ffmpeg output.");
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}

// --- Run --------------------------------------------------------------------
console.log(`\n🎞  Extracting ${FRAME_COUNT} frames from ${INPUT}\n`);

const duration = probeDuration(INPUT);
const fps = (FRAME_COUNT / duration).toFixed(6);
console.log(`   duration: ${duration.toFixed(2)}s → fps ${fps}, ${WIDTH}px wide, WebP q${QUALITY}`);

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

execFileSync(
  ffmpegPath,
  [
    "-i", INPUT,
    "-vf", `fps=${fps},scale=${WIDTH}:-2:flags=lanczos`,
    "-frames:v", String(FRAME_COUNT),
    "-c:v", "libwebp",
    "-quality", String(QUALITY),
    "-compression_level", "6",
    "-hide_banner",
    "-loglevel", "error",
    join(OUT_DIR, "frame-%04d.webp"),
  ],
  { stdio: "inherit" }
);

// --- Report -----------------------------------------------------------------
const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".webp"));
const bytes = files.reduce((sum, f) => sum + statSync(join(OUT_DIR, f)).size, 0);
console.log(
  `\n✅ ${files.length} frames → ${OUT_DIR}  (${(bytes / 1048576).toFixed(2)} MB total, ` +
    `~${Math.round(bytes / files.length / 1024)} KB each)\n`
);
console.log(`   Set --frame-count on the hero to ${files.length} if it changed.\n`);
