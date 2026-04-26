import nodemailer from "nodemailer";

function createTransport() {
  const url = process.env.SMTP_URL?.trim();
  if (url) return nodemailer.createTransport(url);

  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER != null && String(process.env.SMTP_USER).trim() !== ""
        ? {
            user: String(process.env.SMTP_USER).trim(),
            pass: String(process.env.SMTP_PASS || ""),
          }
        : undefined,
  });
}

let transportCache;
function getTransport() {
  if (transportCache === undefined) transportCache = createTransport() || null;
  return transportCache;
}

function getMailFrom() {
  return (process.env.MAIL_FROM || "").trim() || "noreply@tecdigitalito.local";
}

/**
 * @param {object} p
 * @param {string | null | undefined} p.email
 * @param {string} p.username
 * @param {number} p.failedAttempts
 * @param {boolean} p.accountLocked
 * @param {string | null} p.lockedUntilIso
 */
export async function sendFailedLoginNotification(p) {
  const to = (p.email || "").trim();
  const subject = p.accountLocked
    ? "[TEC Digitalito] Cuenta bloqueada temporalmente"
    : "[TEC Digitalito] Intento de inicio de sesión fallido";

  const body = [
    `Hola,`,
    ``,
    `Se registró un intento de inicio de sesión fallido en TEC Digitalito.`,
    `Usuario: ${p.username}`,
    `Hora (servidor): ${new Date().toISOString()}`,
    `Intentos fallidos consecutivos: ${p.failedAttempts}.`,
    p.accountLocked && p.lockedUntilIso
      ? `Tras alcanzar el límite, tu cuenta quedó bloqueada hasta aproximadamente: ${p.lockedUntilIso} (UTC).`
      : null,
    ``,
    `Si no fuiste tú, te recomendamos cambiar la contraseña cuando recuperes el acceso.`,
    `— TEC Digitalito`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!to) {
    console.warn(
      `[TEC Digitalito — correo] Usuario «${p.username}» sin correo en la cuenta; no hay destinatario.`
    );
    console.warn(subject, "\n", body);
    return;
  }

  const transport = getTransport();
  if (!transport) {
    console.log(`[TEC Digitalito — correo simulado] Para: ${to}\nAsunto: ${subject}\n`);
    console.log(body);
    console.log(
      "\nFalta SMTP: define en .env SMTP_URL *o* SMTP_HOST (+ SMTP_USER/SMTP_PASS si aplica) y MAIL_FROM.\n"
    );
    return;
  }

  const from = getMailFrom();
  try {
    await transport.sendMail({
      from,
      to,
      subject,
      text: body,
    });
    console.log(`[TEC Digitalito — correo] Enviado a ${to} (${subject})`);
  } catch (err) {
    console.error("[TEC Digitalito — correo] Error al enviar:", err.message);
    throw err;
  }
}

/**
 * @param {object} p
 * @param {string | null | undefined} p.email
 * @param {string} p.username
 * @param {string} p.ip
 * @param {string[]} p.previousIps
 */
export async function sendSuspiciousLoginAlert(p) {
  const to = (p.email || "").trim();
  const subject = "[TEC Digitalito] Actividad de inicio de sesión inusual";
  const body = [
    `Hola,`,
    ``,
    `Detectamos un inicio de sesión exitoso desde una IP distinta a tus últimas sesiones conocidas.`,
    `Usuario: ${p.username}`,
    `IP actual: ${p.ip}`,
    `IPs recientes (éxitos): ${(p.previousIps || []).join(", ")}`,
    `Hora (servidor): ${new Date().toISOString()}`,
    ``,
    `Si no fuiste tú, cambia tu contraseña y revisa tus dispositivos. Se invalidaron las sesiones “recordarme”.`,
    `— TEC Digitalito`,
  ].join("\n");

  if (!to) {
    console.warn(`[TEC Digitalito — correo] Sin email para aviso sospechoso (${p.username}).`);
    console.warn(subject, "\n", body);
    return;
  }
  const transport = getTransport();
  if (!transport) {
    console.log(`[TEC Digitalito — correo simulado] Para: ${to}\nAsunto: ${subject}\n`);
    console.log(body);
    return;
  }
  const from = getMailFrom();
  try {
    await transport.sendMail({ from, to, subject, text: body });
    console.log(`[TEC Digitalito — correo] Enviado a ${to} (${subject})`);
  } catch (err) {
    console.error("[TEC Digitalito — correo] Error al enviar:", err.message);
    throw err;
  }
}

/**
 * @param {object} p
 * @param {string} p.to
 * @param {string} p.resetUrl
 */
export async function sendPasswordResetEmail(p) {
  const to = (p.to || "").trim();
  if (!to) {
    console.warn("[TEC Digitalito — correo] reset sin destinatario.");
    return;
  }
  const subject = "[TEC Digitalito] Recuperación de contraseña";
  const body = [
    `Hola,`,
    ``,
    `Para definir una nueva contraseña, abre el siguiente enlace (válido 15 minutos):`,
    p.resetUrl,
    ``,
    `Si no solicitaste el cambio, ignora este mensaje.`,
    `— TEC Digitalito`,
  ].join("\n");
  const transport = getTransport();
  if (!transport) {
    console.log(`[TEC Digitalito — correo simulado] Para: ${to}\nAsunto: ${subject}\n`);
    console.log(body);
    return;
  }
  const from = getMailFrom();
  await transport.sendMail({ from, to, subject, text: body });
  console.log(`[TEC Digitalito — correo] Enviado reset a ${to}`);
}
