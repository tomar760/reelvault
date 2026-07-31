/* ReelVault — simple passcode gate (personal tool) */
const { CFG } = require("../config");

module.exports = function auth(req, res, next) {
  if (req.path === "/api/health" || req.path === "/api/verify") return next();
  const code = req.get("x-passcode") || "";
  if (code !== CFG.PASSCODE) {
    return res.status(401).json({ ok: false, error: "unauthorized — wrong passcode" });
  }
  next();
};
