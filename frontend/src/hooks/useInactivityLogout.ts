import { useEffect, useRef } from 'react';

export function useInactivityLogout(
  enabled: boolean,
  timeoutMs: number,
  onExpire: () => void | Promise<void>,
): void {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!enabled) return undefined;

    let expired = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastActivity = Date.now();

    const expire = () => {
      if (expired) return;
      expired = true;
      void onExpireRef.current();
    };

    const reset = () => {
      if (expired) return;
      lastActivity = Date.now();
      if (timer) clearTimeout(timer);
      timer = setTimeout(expire, timeoutMs);
    };

    const checkElapsed = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivity >= timeoutMs) expire();
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];
    events.forEach((eventName) => window.addEventListener(eventName, reset, { passive: true }));
    window.addEventListener('focus', checkElapsed);
    document.addEventListener('visibilitychange', checkElapsed);
    reset();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, reset));
      window.removeEventListener('focus', checkElapsed);
      document.removeEventListener('visibilitychange', checkElapsed);
      if (timer) clearTimeout(timer);
    };
  }, [enabled, timeoutMs]);
}
