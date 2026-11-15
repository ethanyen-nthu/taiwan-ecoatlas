import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    aqi: !!process.env.MOENV_API_KEY,
    weather: !!process.env.CWA_API_KEY,
    persistence: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    boundaryEdition: "2025-03-18",
    milestone: 1,
  });
}
