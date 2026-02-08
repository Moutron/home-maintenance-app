import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * API route for file uploads (photos and receipts)
 * Supports multiple cloud storage providers:
 * - Vercel Blob Storage (recommended for Vercel deployments)
 * - Cloudinary
 * - Fallback to data URLs for development
 * 
 * Features:
 * - Image compression (server-side if sharp is available)
 * - File validation
 * - Size limits (10MB)
 * - Automatic fallback chain
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "photo" or "receipt"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images (JPEG, PNG, WebP) and PDFs are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit` },
        { status: 400 }
      );
    }

    // Compress images server-side if sharp is available
    let processedFile = file;
    let processedBuffer: Buffer | null = null;
    
    if (file.type.startsWith("image/") && file.type !== "image/gif") {
      try {
        // Try to use sharp for server-side compression
        const sharp = await import("sharp").catch(() => null);
        if (sharp) {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Compress image: max width 1920px, quality 85%, convert to WebP if possible
          processedBuffer = await sharp.default(buffer)
            .resize(1920, 1920, { 
              fit: "inside",
              withoutEnlargement: true 
            })
            .webp({ quality: 85 })
            .toBuffer();
          
          // Update file size for response
          processedFile = new File(
            [processedBuffer],
            file.name.replace(/\.[^.]+$/, ".webp"),
            { type: "image/webp" }
          );
        }
      } catch (error) {
        console.warn("Image compression failed, using original:", error);
        // Continue with original file if compression fails
      }
    }

    // Try Vercel Blob Storage first
    const vercelBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (vercelBlobToken) {
      try {
        const { put } = await import("@vercel/blob");
        
        // Use processed buffer if available, otherwise convert file to buffer
        let buffer: Buffer;
        if (processedBuffer) {
          buffer = processedBuffer;
        } else {
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const extension = processedFile.name.split(".").pop();
        const sanitizedName = processedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${userId}/${type}/${timestamp}-${randomId}-${sanitizedName}`;
        
        const blob = await put(filename, buffer, {
          access: "public",
          contentType: processedFile.type,
          addRandomSuffix: false, // We're already adding random ID
        });

        return NextResponse.json({
          url: blob.url,
          filename: file.name, // Return original filename
          size: processedFile.size,
          originalSize: file.size,
          type: processedFile.type,
          compressed: processedBuffer !== null,
        });
      } catch (error) {
        console.error("Vercel Blob upload failed:", error);
        // Fall through to next option
      }
    }

    // Try Cloudinary
    const cloudinaryUrl = process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      try {
        const formDataCloudinary = new FormData();
        formDataCloudinary.append("file", file);
        formDataCloudinary.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET || "default");
        formDataCloudinary.append("folder", `home-maintenance/${userId}/${type}`);

        const response = await fetch(cloudinaryUrl, {
          method: "POST",
          body: formDataCloudinary,
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            url: data.secure_url,
            filename: file.name,
            size: file.size,
            type: file.type,
          });
        }
      } catch (error) {
        console.error("Cloudinary upload failed:", error);
        // Fall through to fallback
      }
    }

    // Fallback: Use data URL for development
    // Note: This stores files in the database, which is not ideal for production
    // Configure one of the cloud storage options above for production use
    let buffer: Buffer;
    if (processedBuffer) {
      buffer = processedBuffer;
    } else {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
    
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${processedFile.type};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      filename: file.name,
      size: processedFile.size,
      originalSize: file.size,
      type: processedFile.type,
      compressed: processedBuffer !== null,
      message:
        process.env.NODE_ENV === "development"
          ? "Using data URL (development mode). Configure cloud storage for production."
          : "File uploaded successfully.",
      warning: !vercelBlobToken && !cloudinaryUrl
        ? "No cloud storage configured. Using data URL fallback (not recommended for production)."
        : undefined,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to upload file",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

