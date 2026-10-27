/**
 * Ringtone Service
 *
 * Plays the default call tones during voice and video calls:
 *   - 'incoming' : ring presented to the callee while a call is ringing.
 *   - 'ringback' : ringback presented to the caller while waiting for an answer.
 *
 * Both tones are bundled WAV assets under public/sounds and are referenced via
 * the Vite base URL so they resolve correctly whether the app is served from
 * the Firebase root ("/") or the StormerHost "/dev/" path.
 *
 * Browser autoplay policies block audio that is not tied to a user gesture.
 * The caller starts a tone right after tapping "call", so playback is allowed.
 * For the callee the first play() may be blocked until the user interacts; we
 * retry once on the next pointer/key event so the ring still sounds.
 */

export type RingtoneKind = 'incoming' | 'ringback';

const ASSETS: Record<RingtoneKind, string> = {
  incoming: 'sounds/ringtone.wav',
  ringback: 'sounds/ringback.wav',
};

function assetUrl(kind: RingtoneKind): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/+$/, '')}/${ASSETS[kind]}`;
}

export interface RingtoneHandle {
  stop: () => void;
}

/**
 * Begin looping the requested tone. Returns a handle whose stop() must be
 * called when the call connects, ends, or the component unmounts.
 */
export function playRingtone(kind: RingtoneKind): RingtoneHandle {
  let stopped = false;
  let removeGestureRetry: (() => void) | undefined;

  const audio = new Audio(assetUrl(kind));
  audio.loop = true;
  audio.preload = 'auto';
  // Keep the ring comfortably below full scale; the WAV is already normalized.
  audio.volume = kind === 'incoming' ? 0.9 : 0.6;

  const attemptPlay = () => {
    if (stopped) return;
    const started = audio.play();
    if (started && typeof started.then === 'function') {
      started.catch(() => {
        // Autoplay blocked: retry once after the next user gesture.
        if (stopped || removeGestureRetry) return;
        const retry = () => {
          removeGestureRetry?.();
          removeGestureRetry = undefined;
          if (!stopped) void audio.play().catch(() => undefined);
        };
        window.addEventListener('pointerdown', retry, { once: true });
        window.addEventListener('keydown', retry, { once: true });
        removeGestureRetry = () => {
          window.removeEventListener('pointerdown', retry);
          window.removeEventListener('keydown', retry);
        };
      });
    }
  };

  attemptPlay();

  // Vibrate on the callee side to match the incoming ring cadence.
  let vibrationTimer: number | undefined;
  if (kind === 'incoming' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const pulse = () => {
      if (stopped) return;
      navigator.vibrate?.([400, 200, 400]);
    };
    pulse();
    vibrationTimer = window.setInterval(pulse, 2000);
  }

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      removeGestureRetry?.();
      removeGestureRetry = undefined;
      if (vibrationTimer !== undefined) window.clearInterval(vibrationTimer);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(0);
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      } catch {
        // ignore teardown errors
      }
    },
  };
}
