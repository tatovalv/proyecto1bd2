/** Normaliza valores de req.body (multer a veces entrega arrays si hay campos repetidos). */
export function asText(value, trim) {
  if (value == null) return "";
  const v = Array.isArray(value) ? value[0] : value;
  const s = String(v ?? "");
  return trim ? s.trim() : s;
}
