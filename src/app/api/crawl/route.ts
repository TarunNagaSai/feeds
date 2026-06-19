import { getAuth } from "firebase-admin/auth";
import { isAllowedEmail } from "@/lib/access";
import { getAdminApp } from "@/lib/crawler/admin";
import { runCrawl } from "@/lib/crawler";

// In-app "Refresh feed" trigger, authenticated with the owner's Firebase ID
// token (sent by the client). Node runtime (firebase-admin + network), no cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return Response.json({ ok: false, error: "Missing token" }, { status: 401 });
  }

  let email: string | undefined;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    email = decoded.email;
  } catch {
    return Response.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }
  if (!isAllowedEmail(email)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runCrawl();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
