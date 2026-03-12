import { NextResponse } from "next/server";
import { COMMON_VEHICLE_MAKES } from "@/lib/vehicles/common-makes";

export async function GET() {
  return NextResponse.json({ makes: [...COMMON_VEHICLE_MAKES] });
}
