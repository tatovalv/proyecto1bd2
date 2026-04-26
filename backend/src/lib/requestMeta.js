/** @param {import('express').Request} req */
export function clientIp(req) {
  const xf = (req.headers["x-forwarded-for"] || "").toString().split(",")[0]?.trim();
  if (xf) return xf;
  return req.socket?.remoteAddress || "";
}

/** @param {import('express').Request} req */
export function userAgent(req) {
  return (req.headers["user-agent"] || "").toString().slice(0, 512);
}
