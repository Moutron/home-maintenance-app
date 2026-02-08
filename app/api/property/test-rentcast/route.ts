import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to verify RentCast API key is working
 * Call this to debug RentCast integration
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.RENTCAST_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: "RENTCAST_API_KEY not found in environment variables",
        hint: "Add RENTCAST_API_KEY to your .env file"
      },
      { status: 400 }
    );
  }

  // Test with a sample address
  const testAddress = "1600 Pennsylvania Avenue NW, Washington, DC 20500";
  
  try {
    const url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(testAddress)}`;
    console.log("Testing RentCast API with URL:", url);
    console.log("Using API key:", apiKey.substring(0, 10) + "...");
    
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });

    const responseText = await response.text();
    console.log("RentCast response status:", response.status);
    console.log("RentCast response headers:", Object.fromEntries(response.headers.entries()));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: responseData,
          apiKeyConfigured: true,
          apiKeyPrefix: apiKey.substring(0, 10) + "...",
        },
        { status: 200 } // Return 200 so we can see the error details
      );
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      data: responseData,
      apiKeyConfigured: true,
      apiKeyPrefix: apiKey.substring(0, 10) + "...",
      message: "RentCast API is working correctly!",
    });
  } catch (error) {
    console.error("Error testing RentCast API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        apiKeyConfigured: true,
        apiKeyPrefix: apiKey.substring(0, 10) + "...",
      },
      { status: 500 }
    );
  }
}

