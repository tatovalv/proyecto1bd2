export function requireRole(...allowedRoles) {
  const allowed = new Set(
    allowedRoles
      .map((r) => String(r || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return (req, res, next) => {
    const role = String(req.user?.role || "student").toLowerCase();
    if (!allowed.size || allowed.has(role)) {
      next();
      return;
    }
    res.status(403).json({ error: "No autorizado para este rol." });
  };
}

