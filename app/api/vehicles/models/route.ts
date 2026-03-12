import { NextRequest, NextResponse } from "next/server";

const NHTSA_BASE = "https://vpic.nhtsa.dot.gov/api";

const MIN_YEAR = 1900;
const MAX_YEAR = new Date().getFullYear() + 1;

export async function GET(request: NextRequest) {
  const make = request.nextUrl.searchParams.get("make");
  if (!make || !make.trim()) {
    return NextResponse.json(
      { error: "Make is required" },
      { status: 400 }
    );
  }
  const yearParam = request.nextUrl.searchParams.get("year");
  const year =
    yearParam != null && yearParam !== ""
      ? parseInt(yearParam, 10)
      : null;
  const useYear =
    year != null &&
    !Number.isNaN(year) &&
    year >= MIN_YEAR &&
    year <= MAX_YEAR;

  try {
    const makeTrim = make.trim();
    const makeEnc = encodeURIComponent(makeTrim);
    const url = useYear
      ? `${NHTSA_BASE}/vehicles/GetModelsForMakeYear/make/${makeTrim.toLowerCase()}/modelyear/${year}?format=json`
      : `${NHTSA_BASE}/vehicles/GetModelsForMake/${makeEnc}?format=json`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      throw new Error("NHTSA models fetch failed");
    }
    const data = (await res.json()) as {
      Results?: Array<{ Model_Name: string }>;
    };
    const raw = data.Results ?? [];
    const models = [...new Set(raw.map((r) => r.Model_Name.trim()))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching vehicle models:", error);
    return NextResponse.json(
      { error: "Failed to load models" },
      { status: 500 }
    );
  }
}
