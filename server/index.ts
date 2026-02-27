import { initDatabase } from "./db";
import { register, login, getMe } from "./routes/auth";
import { listTags, createTag, getTag, updateTag, deleteTag } from "./routes/tags";
import { listStudents, getStudent, createStudent, updateStudent, deleteStudent } from "./routes/students";
import {
  listProfessors,
  getProfessor,
  createProfessor,
  updateProfessor,
  deleteProfessor,
  getProfessorInsights,
} from "./routes/professors";
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse } from "./routes/courses";
import { listSemesters, getSemester, createSemester, deleteSemester } from "./routes/semesters";
import { listSections, getSection, createSection, deleteSection } from "./routes/sections";
import { getPreferences, setPreferences } from "./routes/preferences";
import { listReviews, getReview, createReview, deleteReview } from "./routes/reviews";

// Initialize database tables
initDatabase();

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function addCorsHeaders(res: Response): Response {
  const newHeaders = new Headers(res.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Simple path pattern matcher: "/api/things/:id" -> extract id
function matchRoute(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

Bun.serve({
  port: 8000,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    let response: Response;
    let params: Record<string, string> | null;

    try {
      // --- Auth ---
      if (pathname === "/api/auth/register" && method === "POST") {
        response = await register((await parseBody(req)) as Parameters<typeof register>[0]);
      } else if (pathname === "/api/auth/login" && method === "POST") {
        response = await login((await parseBody(req)) as Parameters<typeof login>[0]);
      } else if (pathname === "/api/auth/me" && method === "GET") {
        response = await getMe(req.headers.get("Authorization"));
      }

      // --- Tags ---
      else if (pathname === "/api/tags" && method === "GET") {
        response = listTags(url);
      } else if (pathname === "/api/tags" && method === "POST") {
        response = createTag((await parseBody(req)) as Parameters<typeof createTag>[0]);
      } else if ((params = matchRoute("/api/tags/:id", pathname)) && method === "GET") {
        response = getTag(Number(params.id));
      } else if ((params = matchRoute("/api/tags/:id", pathname)) && method === "PUT") {
        response = updateTag(Number(params.id), (await parseBody(req)) as Parameters<typeof updateTag>[1]);
      } else if ((params = matchRoute("/api/tags/:id", pathname)) && method === "DELETE") {
        response = deleteTag(Number(params.id));
      }

      // --- Students ---
      else if (pathname === "/api/students" && method === "GET") {
        response = listStudents();
      } else if (pathname === "/api/students" && method === "POST") {
        response = createStudent((await parseBody(req)) as Parameters<typeof createStudent>[0]);
      } else if ((params = matchRoute("/api/students/:id", pathname)) && method === "GET") {
        response = getStudent(Number(params.id));
      } else if ((params = matchRoute("/api/students/:id", pathname)) && method === "PUT") {
        response = updateStudent(Number(params.id), (await parseBody(req)) as Parameters<typeof updateStudent>[1]);
      } else if ((params = matchRoute("/api/students/:id", pathname)) && method === "DELETE") {
        response = deleteStudent(Number(params.id));
      }

      // --- Student Preferences ---
      else if ((params = matchRoute("/api/students/:id/preferences", pathname)) && method === "GET") {
        response = getPreferences(Number(params.id));
      } else if ((params = matchRoute("/api/students/:id/preferences", pathname)) && method === "PUT") {
        response = setPreferences(Number(params.id), (await parseBody(req)) as Parameters<typeof setPreferences>[1]);
      }

      // --- Professors ---
      else if (pathname === "/api/professors" && method === "GET") {
        response = listProfessors();
      } else if (pathname === "/api/professors" && method === "POST") {
        response = createProfessor((await parseBody(req)) as Parameters<typeof createProfessor>[0]);
      } else if ((params = matchRoute("/api/professors/:id/insights", pathname)) && method === "GET") {
        response = getProfessorInsights(Number(params.id));
      } else if ((params = matchRoute("/api/professors/:id", pathname)) && method === "GET") {
        response = getProfessor(Number(params.id));
      } else if ((params = matchRoute("/api/professors/:id", pathname)) && method === "PUT") {
        response = updateProfessor(
          Number(params.id),
          (await parseBody(req)) as Parameters<typeof updateProfessor>[1],
        );
      } else if ((params = matchRoute("/api/professors/:id", pathname)) && method === "DELETE") {
        response = deleteProfessor(Number(params.id));
      }

      // --- Courses ---
      else if (pathname === "/api/courses" && method === "GET") {
        response = listCourses(url);
      } else if (pathname === "/api/courses" && method === "POST") {
        response = createCourse((await parseBody(req)) as Parameters<typeof createCourse>[0]);
      } else if ((params = matchRoute("/api/courses/:id", pathname)) && method === "GET") {
        response = getCourse(Number(params.id));
      } else if ((params = matchRoute("/api/courses/:id", pathname)) && method === "PUT") {
        response = updateCourse(Number(params.id), (await parseBody(req)) as Parameters<typeof updateCourse>[1]);
      } else if ((params = matchRoute("/api/courses/:id", pathname)) && method === "DELETE") {
        response = deleteCourse(Number(params.id));
      }

      // --- Semesters ---
      else if (pathname === "/api/semesters" && method === "GET") {
        response = listSemesters();
      } else if (pathname === "/api/semesters" && method === "POST") {
        response = createSemester((await parseBody(req)) as Parameters<typeof createSemester>[0]);
      } else if ((params = matchRoute("/api/semesters/:id", pathname)) && method === "GET") {
        response = getSemester(Number(params.id));
      } else if ((params = matchRoute("/api/semesters/:id", pathname)) && method === "DELETE") {
        response = deleteSemester(Number(params.id));
      }

      // --- Sections ---
      else if (pathname === "/api/sections" && method === "GET") {
        response = listSections(url);
      } else if (pathname === "/api/sections" && method === "POST") {
        response = createSection((await parseBody(req)) as Parameters<typeof createSection>[0]);
      } else if ((params = matchRoute("/api/sections/:id", pathname)) && method === "GET") {
        response = getSection(Number(params.id));
      } else if ((params = matchRoute("/api/sections/:id", pathname)) && method === "DELETE") {
        response = deleteSection(Number(params.id));
      }

      // --- Reviews ---
      else if (pathname === "/api/reviews" && method === "GET") {
        response = listReviews(url);
      } else if (pathname === "/api/reviews" && method === "POST") {
        response = createReview((await parseBody(req)) as Parameters<typeof createReview>[0]);
      } else if ((params = matchRoute("/api/reviews/:id", pathname)) && method === "GET") {
        response = getReview(Number(params.id));
      } else if ((params = matchRoute("/api/reviews/:id", pathname)) && method === "DELETE") {
        response = deleteReview(Number(params.id));
      }

      // --- Hello (keep for testing) ---
      else if (pathname === "/api/hello" && method === "GET") {
        response = json({ message: "Hello World" });
      }

      // --- Not Found ---
      else {
        response = json({ error: "Not Found" }, 404);
      }
    } catch (err) {
      console.error("Server error:", err);
      response = json({ error: "Internal Server Error" }, 500);
    }

    return addCorsHeaders(response);
  },
});

console.log("Server running on http://localhost:8000");