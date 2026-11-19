import "server-only";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Reads an optional uploaded file into a data URL for storage in the database.
 * Small documents only (2 MB). For heavier use, move these to object storage such as Supabase Storage.
 */
export async function readUpload(v: FormDataEntryValue | null): Promise<{ file?: { name: string; dataUrl: string }; error?: string }> {
  if (!v || typeof v === "string" || v.size === 0) return {};
  if (v.size > MAX_FILE_BYTES) return { error: "The file is larger than 2 MB. Upload a smaller photo or PDF." };
  if (!TYPES.includes(v.type)) return { error: "Upload a JPG, PNG, WebP or PDF file." };
  const b64 = Buffer.from(await v.arrayBuffer()).toString("base64");
  return { file: { name: v.name.slice(0, 120) || "upload", dataUrl: `data:${v.type};base64,${b64}` } };
}
