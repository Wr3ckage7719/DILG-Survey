export function vibrateError() {
  try {
    navigator.vibrate?.(200);
  } catch {}
}

export function playErrorSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 330;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

export function scrollToError(key: string) {
  const el = document.querySelector(`[data-error-field="${key}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
