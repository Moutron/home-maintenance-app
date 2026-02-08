import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - List all project templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const isActive = searchParams.get("isActive") !== "false"; // Default to true

    const where: any = {};
    if (isActive) {
      where.isActive = true;
    }
    if (category && category !== "all") {
      where.category = category;
    }
    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty;
    }

    const templates = await prisma.projectTemplate.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { difficulty: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch templates",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

