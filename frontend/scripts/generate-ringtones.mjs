#!/usr/bin/env node
/**
 * Generate default call ringtones as WAV assets.
 *
 * Produces two royalty-free, synthesized tones (no external/licensed audio):
 *   - public/sounds/ringtone.wav : incoming-call ring (callee side)
 *   - public/sounds/ringback.wav : outgoing ringback (caller side)
 *
 * Both use the classic 440 Hz + 480 Hz dual-tone ring with a 2s-on / 4s-off
 * cadence so the asset loops seamlessly for the full duration of a call.
 *
 * This script shells out to python3 (+numpy) which is available locally and
 * keeps the repo free of any binary-audio build dependency. Run:
 *   node scripts/generate-ringtones.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'sounds');
mkdirSync(outDir, { recursive: true });

const py = `
import wave, struct, math, sys
import numpy as np

SR = 44100

def ring_cycle():
    # 2 seconds of 440+480 Hz dual tone, then 4 seconds of silence.
    t = np.linspace(0, 2.0, int(SR * 2.0), endpoint=False)
    tone = 0.5 * (np.sin(2*np.pi*440*t) + np.sin(2*np.pi*480*t)) / 2.0
    # Short fade in/out so each ring burst has no click.
    fade = int(SR * 0.02)
    env = np.ones_like(tone)
    env[:fade] = np.linspace(0, 1, fade)
    env[-fade:] = np.linspace(1, 0, fade)
    tone *= env
    silence = np.zeros(int(SR * 4.0))
    return np.concatenate([tone, silence])

def write_wav(path, samples):
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767).astype('<i2')
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

out_dir = sys.argv[1]

# One full ring cycle loops cleanly in the browser via <audio loop>.
cycle = ring_cycle()
write_wav(out_dir + '/ringtone.wav', cycle)

# Ringback: same tone but slightly quieter so the caller's own earpiece tone
# is less harsh than the incoming ring presented to the callee.
write_wav(out_dir + '/ringback.wav', cycle * 0.7)

print('wrote', out_dir + '/ringtone.wav')
print('wrote', out_dir + '/ringback.wav')
`;

const result = spawnSync('python3', ['-c', py, outDir], { stdio: 'inherit' });
if (result.status !== 0) {
  console.error('Failed to generate ringtones (python3 + numpy required).');
  process.exit(result.status ?? 1);
}
