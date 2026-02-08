import { NextRequest, NextResponse } from "next/server";
import {
  getComplianceRecommendations,
  getPermitRequirements,
} from "@/lib/utils/local-regulations";

/**
 * API route to lookup local compliance requirements and regulations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let {
      city,
      state,
      zipCode,
      yearBuilt,
      homeType,
      county,
      taskCategory,
      taskName,
    } = body;

    // Validate and normalize inputs
    if (!city || !state || !zipCode) {
      return NextResponse.json(
        { error: "City, state, and zipCode are required" },
        { status: 400 }
      );
    }

    // Normalize ZIP code (remove spaces, validate format)
    zipCode = zipCode.trim().replace(/\s+/g, '');
    const zipCodeRegex = /^\d{5}(-\d{4})?$/;
    if (!zipCodeRegex.test(zipCode)) {
      return NextResponse.json(
        { 
          error: "Invalid ZIP code format",
          message: `ZIP code "${zipCode}" does not match required format. Expected: 12345 or 12345-6789`,
          received: zipCode
        },
        { status: 400 }
      );
    }

    // Normalize state (ensure uppercase, 2 characters)
    state = state.trim().toUpperCase();
    if (state.length !== 2) {
      return NextResponse.json(
        { 
          error: "Invalid state format",
          message: `State must be exactly 2 characters. Received: "${state}"`,
          received: state
        },
        { status: 400 }
      );
    }

    // Normalize city
    city = city.trim();

    // Get compliance recommendations
    const compliance = await getComplianceRecommendations(
      city,
      state,
      zipCode,
      yearBuilt || new Date().getFullYear(),
      homeType || "single-family",
      county
    );

    // Get permit requirements if task info provided
    let permitInfo = null;
    if (taskCategory && taskName) {
      permitInfo = getPermitRequirements(city, state, taskCategory, taskName);
    }

    return NextResponse.json({
      success: true,
      compliance,
      permitInfo,
      recommendations: [
        ...(compliance.summary.required > 0
          ? [
              `⚠️ You have ${compliance.summary.required} required compliance item(s). These are legally required and may result in fines if not completed.`,
            ]
          : []),
        ...(compliance.summary.critical > 0
          ? [
              `🔴 ${compliance.summary.critical} critical safety requirement(s) must be addressed immediately.`,
            ]
          : []),
        ...(permitInfo?.requiresPermit
          ? [
              `📋 This task requires a ${permitInfo.permitType}. Check with your local building department before starting.`,
            ]
          : []),
      ],
    });
  } catch (error) {
    console.error("Error looking up compliance:", error);
    return NextResponse.json(
      { error: "Failed to lookup compliance requirements" },
      { status: 500 }
    );
  }
}

