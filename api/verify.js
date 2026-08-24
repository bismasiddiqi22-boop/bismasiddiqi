import { checkPassword } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  const { password } = req.body || {};
  if (checkPassword(password)) {
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: "Incorrect password" });
  }
}
