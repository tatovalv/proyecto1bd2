/** Después de cuántos intentos fallidos se bloquea la cuenta (HU3). */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

/** Duración del bloqueo en ms (LOCKOUT_MINUTES; por defecto 30 min según especificación). */
export function lockoutDurationMs() {
  const minutes = Number(process.env.LOCKOUT_MINUTES);
  const m = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
  return m * 60 * 1000;
}
