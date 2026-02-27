import { db } from "../db";
import { SignJWT, jwtVerify } from "jose";

// JWT secret key — in production, load from environment variable
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production",
);
const JWT_ISSUER = "course-platform";
const JWT_EXPIRATION = "7d";

// --- JWT helpers ---

async function createToken(payload: { id: number; role: "student" | "professor" }): Promise<string> {
  return await new SignJWT({ sub: String(payload.id), role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

async function verifyToken(
  token: string,
): Promise<{ id: number; role: "student" | "professor" } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });
    if (!payload.sub || !payload.role) return null;
    return {
      id: Number(payload.sub),
      role: payload.role as "student" | "professor",
    };
  } catch {
    return null;
  }
}

// --- Password helpers ---

async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password);
}

async function checkPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// --- Types ---

interface RegisterBody {
  email: string;
  name: string;
  password: string;
  role: "student" | "professor";
}

interface LoginBody {
  email: string;
  password: string;
}

// --- Route handlers ---

export async function register(body: RegisterBody): Promise<Response> {
  if (!body.email || !body.name || !body.password || !body.role) {
    return json({ error: "Missing required fields" }, 400);
  }

  if (body.role !== "student" && body.role !== "professor") {
    return json({ error: "Role must be 'student' or 'professor'" }, 400);
  }

  const table = body.role === "student" ? "students" : "professors";

  const existing = db.query(`SELECT id FROM ${table} WHERE email = ?`).get(body.email);
  if (existing) {
    return json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(body.password);

  const stmt = db.query(
    `INSERT INTO ${table} (email, name, password_hash) VALUES (?, ?, ?) RETURNING id, email, name, created_at`,
  );
  const user = stmt.get(body.email, body.name, passwordHash) as {
    id: number;
    email: string;
    name: string;
    created_at: string;
  };

  const token = await createToken({ id: user.id, role: body.role });

  return json(
    {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: body.role },
    },
    201,
  );
}

export async function login(body: LoginBody): Promise<Response> {
  if (!body.email || !body.password) {
    return json({ error: "Missing required fields" }, 400);
  }

  for (const role of ["student", "professor"] as const) {
    const table = role === "student" ? "students" : "professors";
    const user = db.query(`SELECT * FROM ${table} WHERE email = ?`).get(body.email) as {
      id: number;
      email: string;
      name: string;
      password_hash: string;
    } | null;

    if (user && (await checkPassword(body.password, user.password_hash))) {
      const token = await createToken({ id: user.id, role });

      return json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role },
      });
    }
  }

  return json({ error: "Invalid email or password" }, 401);
}

export async function getMe(authHeader: string | null): Promise<Response> {
  const authUser = await getAuthUser(authHeader);
  if (!authUser) {
    return json({ error: "Unauthorized" }, 401);
  }

  const table = authUser.role === "student" ? "students" : "professors";
  const user = db
    .query(`SELECT id, email, name, created_at FROM ${table} WHERE id = ?`)
    .get(authUser.id);
  if (!user) {
    return json({ error: "User not found" }, 404);
  }

  return json({ ...(user as object), role: authUser.role });
}

// Helper to extract user from auth header (for use in other routes)
export async function getAuthUser(
  authHeader: string | null,
): Promise<{ id: number; role: "student" | "professor" } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return await verifyToken(token);
}

// --- Helper ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
