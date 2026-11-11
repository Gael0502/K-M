import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import express from "express";
import Database from "better-sqlite3";
import rateLimit from "express-rate-limit";

const scrypt = promisify(crypto.scrypt);
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || (production ? 3000 : 3001));
const databasePath = path.resolve(process.env.DB_PATH || path.join("data", "k-and-m.sqlite"));
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('farmer', 'buyer', 'delivery', 'admin')),
    verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
`);

const findUserByEmail = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE");
const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, password_salt, role, verified, created_at)
  VALUES (@id, @name, @email, @passwordHash, @passwordSalt, @role, @verified, @createdAt)
`);
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  verified: Boolean(user.verified),
  createdAt: user.created_at,
});
const newPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: derived.toString("hex") };
};
const checkPassword = async (password, salt, storedHash) => {
  const actual = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

async function createUser({ name, email, password, role, verified = false }) {
  const credentials = await newPassword(password);
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: credentials.hash,
    passwordSalt: credentials.salt,
    role,
    verified: Number(verified),
    createdAt: new Date().toISOString(),
  };
  insertUser.run(user);
  return safeUser({ ...user, created_at: user.createdAt });
}

async function initializeAccounts() {
  if (!production && process.env.KM_SEED_DEMO_USERS !== "false") {
    const demos = [
      ["Aline Uwase", "farmer@kandm.rw", "farmer"],
      ["Jean Claude", "buyer@kandm.rw", "buyer"],
      ["Eric Nshimiyimana", "delivery@kandm.rw", "delivery"],
      ["Mireille Ingabire", "admin@kandm.rw", "admin"],
    ];
    for (const [name, email, role] of demos) {
      if (!findUserByEmail.get(email)) {
        await createUser({ name, email, password: "demo123", role, verified: true });
      }
    }
  }

  if (process.env.BOOTSTRAP_ADMIN_EMAIL) {
    const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL).trim().toLowerCase();
    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || "");
    const name = String(process.env.BOOTSTRAP_ADMIN_NAME || "K&M Administrator").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || name.length < 2) {
      throw new Error("BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, and a 12+ character BOOTSTRAP_ADMIN_PASSWORD are required for an admin bootstrap.");
    }
    const existing = findUserByEmail.get(email);
    if (!existing) {
      await createUser({ name, email, password, role: "admin", verified: true });
    } else if (existing.role !== "admin") {
      throw new Error("BOOTSTRAP_ADMIN_EMAIL is already registered as a non-admin account.");
    }
  } else if (production && Number(db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get().count) === 0) {
    throw new Error("No administrator exists. Configure BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD (12+ characters), and BOOTSTRAP_ADMIN_NAME for the first start.");
  }
}

const app = express();
app.disable("x-powered-by");
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  if (request.method !== "GET" && request.method !== "HEAD" && request.headers.origin) {
    try {
      if (new URL(request.headers.origin).host !== request.headers.host) {
        return response.status(403).json({ error: "This request origin is not allowed." });
      }
    } catch {
      return response.status(403).json({ error: "This request origin is not allowed." });
    }
  }
  next();
});
app.use(express.json({ limit: "16kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
});

function sessionCookie(response, token, maxAge) {
  response.cookie("km_session", token, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

function authenticated(request, response, next) {
  const token = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("km_session="))?.slice("km_session=".length);
  if (!token || token.length > 200 || !/^[A-Za-z0-9_-]+$/.test(token)) return response.status(401).json({ error: "Please sign in to continue." });
  const session = db.prepare(`
    SELECT users.*, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(hashToken(token));
  if (!session || session.expires_at <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    response.clearCookie("km_session", { httpOnly: true, secure: production, sameSite: "lax", path: "/" });
    return response.status(401).json({ error: "Your session expired. Please sign in again." });
  }
  request.user = safeUser(session);
  next();
}

function requireRole(...roles) {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) return response.status(403).json({ error: "You do not have permission to access this resource." });
    next();
  };
}

async function issueSession(user, response) {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(hashToken(token), user.id, now + 7 * 24 * 60 * 60 * 1000, now);
  sessionCookie(response, token, 7 * 24 * 60 * 60 * 1000);
  return user;
}

app.post("/api/auth/register", authLimiter, async (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name.trim() : "";
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  const role = request.body?.role;
  if (name.length < 2 || name.length > 80) return response.status(400).json({ error: "Enter a name between 2 and 80 characters." });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 10 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return response.status(400).json({ error: "Use a password of at least 10 characters, including a letter and a number." });
  }
  if (!["farmer", "buyer", "delivery"].includes(role)) return response.status(400).json({ error: "Choose a valid account type." });
  if (findUserByEmail.get(email)) return response.status(409).json({ error: "An account with that email already exists." });

  try {
    const user = await createUser({ name, email, password, role });
    return response.status(201).json({ user: await issueSession(user, response) });
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") return response.status(409).json({ error: "An account with that email already exists." });
    throw error;
  }
});

app.post("/api/auth/login", authLimiter, async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  const user = email.length <= 254 ? findUserByEmail.get(email) : null;
  if (!user || password.length > 128 || !(await checkPassword(password, user.password_salt, user.password_hash))) {
    return response.status(401).json({ error: "The email or password is incorrect." });
  }
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  return response.json({ user: await issueSession(safeUser(user), response) });
});

app.get("/api/auth/me", authenticated, (request, response) => response.json({ user: request.user }));

app.post("/api/auth/logout", authenticated, (request, response) => {
  const token = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("km_session="))?.slice("km_session=".length);
  if (token && /^[A-Za-z0-9_-]+$/.test(token)) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  response.clearCookie("km_session", { httpOnly: true, secure: production, sameSite: "lax", path: "/" });
  response.status(204).end();
});

app.get("/api/users", authenticated, requireRole("admin"), (_request, response) => {
  const users = db.prepare("SELECT id, name, email, role, verified, created_at FROM users ORDER BY created_at DESC")
    .all().map(safeUser);
  response.json({ users });
});

app.patch("/api/users/:id/verification", authenticated, requireRole("admin"), (request, response) => {
  const verified = request.body?.verified;
  if (typeof verified !== "boolean") return response.status(400).json({ error: "Verification status must be true or false." });
  const result = db.prepare("UPDATE users SET verified = ? WHERE id = ? AND role IN ('farmer', 'delivery')")
    .run(Number(verified), request.params.id);
  if (result.changes === 0) return response.status(404).json({ error: "That farmer or delivery account was not found." });
  response.json({ user: safeUser(db.prepare("SELECT * FROM users WHERE id = ?").get(request.params.id)) });
});

app.use("/api", (_request, response) => response.status(404).json({ error: "API endpoint not found." }));

if (production) {
  const staticDirectory = path.resolve(process.env.STATIC_DIR || "dist");
  app.use(express.static(staticDirectory, { index: false, maxAge: "1h" }));
  app.get(/.*/, (_request, response) => response.sendFile(path.join(staticDirectory, "index.html")));
}

app.use((error, _request, response, _next) => {
  console.error("Request failed:", error);
  if (response.headersSent) return;
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  const message = error.type === "entity.parse.failed"
    ? "Request body must be valid JSON."
    : error.type === "entity.too.large"
      ? "Request body is too large."
      : status === 500 ? "The server could not complete that request." : "The request could not be processed.";
  response.status(status).json({ error: message });
});

await initializeAccounts();
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`K&M ${production ? "app" : "API"} listening on http://0.0.0.0:${port}`);
  if (!production && process.env.KM_SEED_DEMO_USERS !== "false") {
    console.log("Development demo accounts (password: demo123): farmer@kandm.rw, buyer@kandm.rw, delivery@kandm.rw, admin@kandm.rw");
  }
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
