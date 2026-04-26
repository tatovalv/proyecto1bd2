/**
 * @typedef {Object} StoredUser
 * @property {string} id
 * @property {string} username
 * @property {string} passwordHash - contraseña solo como hash (nunca texto plano)
 * @property {string} salt - sal en hex (trabajo con hash separado del password)
 * @property {string} fullName
 * @property {string} dateOfBirth - YYYY-MM-DD
 * @property {string | null} avatarPath - ruta pública tipo /uploads/avatars/...
 * @property {string | null} [lastLoginAt] - ISO 8601 del último login exitoso
 * @property {string[]} [loginHistory] - marcas de tiempo ISO de cada login exitoso
 * @property {string | null} [email] - para avisos de seguridad (p. ej. intentos fallidos)
 * @property {number} [failedLoginAttempts] - intentos fallidos consecutivos
 * @property {string | null} [lockedUntil] - ISO 8601; bloqueo hasta esta hora (UTC)
 */

export {};
