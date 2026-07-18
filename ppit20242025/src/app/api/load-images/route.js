import cloudinary from "../../../lib/cloudinary";

export const revalidate = 3600; // Next.js cache hint (1 hour)

// Simple in-memory cache
const CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");
  const cursor = searchParams.get("cursor") || "FIRST";

  if (!folder) {
    return Response.json({ images: [], nextCursor: null });
  }

  const cacheKey = `${folder}:${cursor}`;

  // ✅ Return cached result if valid
  if (CACHE.has(cacheKey)) {
    const { data, time } = CACHE.get(cacheKey);
    if (Date.now() - time < CACHE_TTL) {
      return Response.json(data);
    }
    CACHE.delete(cacheKey);
  }

  // ⏳ Slow Cloudinary call (only once per key)
  const result = await cloudinary.search
    .expression(`folder:${folder}`)
    .sort_by("public_id", "asc")
    .max_results(15)
    .next_cursor(cursor === "FIRST" ? undefined : cursor)
    .execute();

  const data = {
    images: result.resources.map((r) => r.public_id),
    nextCursor: result.next_cursor || null,
  };

  // 💾 Cache result
  CACHE.set(cacheKey, {
    data,
    time: Date.now(),
  });

  return Response.json(data);
}
