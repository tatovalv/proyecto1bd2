import bcrypt from "bcryptjs";

const ROUNDS = 12;

/** @param {string} password */
export async function hashPasswordWithSalt(password) {
  const salt = await bcrypt.genSalt(ROUNDS);
  const passwordHash = await bcrypt.hash(password, salt);
  return { salt, passwordHash };
}

/**
 * @param {string} password
 * @param {string} passwordHash - hash bcrypt (campo `password_hash`)
 */
export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
