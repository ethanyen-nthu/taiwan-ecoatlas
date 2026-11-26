import { searchRows } from "@/server/search-index";

/** The search page's index: one small file, built when the site is built. */
export const dynamic = "force-static";

export async function GET() {
  return Response.json(await searchRows(), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
