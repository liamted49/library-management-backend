// TODO: Students must implement authentication and role-based access control here.
// Remove this stub and implement JWT verification and role checking as required in the exam.
import { getClientPromise } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret";

export async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const client = await getClientPromise();
    const db = client.db("library_management");
    const user = await db.collection("users").findOne(
      { _id: decoded.id },
      { projection: { password: 0 } }
    );

    return user;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(request) {
  const user = await getUserFromToken();
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }
  return { user };
}

export async function requireRole(request, requiredRole) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return authResult;
  }

  const { user } = authResult;
  if (user.role !== requiredRole) {
    return { error: "Forbidden", status: 403 };
  }

  return { user };
}

export async function requireAdmin(request) {
  return requireRole(request, "ADMIN");
}
