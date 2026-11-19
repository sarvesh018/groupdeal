import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/session";

/** Serves an uploaded showroom document or booking receipt. Admins only. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new Response("Not found", { status: 404 });
  const { id } = await params;
  const kind = new URL(req.url).searchParams.get("kind");
  const db = await getDb();
  const table = kind === "receipt" ? schema.bookingProofs : schema.showroomDocuments;
  const [row] = await db.select({ fileName: table.fileName, dataUrl: table.dataUrl }).from(table).where(eq(table.id, Number(id)));
  if (!row) return new Response("Not found", { status: 404 });
  const m = /^data:([^;]+);base64,(.*)$/.exec(row.dataUrl);
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Content-Disposition": `inline; filename="${row.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
