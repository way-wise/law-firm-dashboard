import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const logo = formData.get("logo") as File | null;

    // Validate inputs
    if (!title || !description) {
      return NextResponse.json(
        { message: "Title and description are required" },
        { status: 400 }
      );
    }

    // Handle logo upload if provided
    if (logo) {
      // Validate file type
      if (logo.type !== "image/png") {
        return NextResponse.json(
          { message: "Only PNG files are allowed for logo" },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      if (logo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { message: "Logo file size must be less than 5MB" },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const bytes = await logo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save to public/logo.png (replace existing)
      const publicPath = path.join(process.cwd(), "public");
      
      // Ensure public directory exists
      if (!existsSync(publicPath)) {
        await mkdir(publicPath, { recursive: true });
      }

      const logoPath = path.join(publicPath, "logo.png");
      await writeFile(logoPath, buffer);
    }

    // Save title and description to a JSON file in public
    const settingsPath = path.join(process.cwd(), "public", "platform-settings.json");
    const settings = {
      title,
      description,
      updatedAt: new Date().toISOString(),
    };
    
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));

    return NextResponse.json({
      message: "Platform settings saved successfully",
      settings,
    });
  } catch (error) {
    console.error("Error saving platform settings:", error);
    return NextResponse.json(
      { message: "Failed to save platform settings" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current settings
export async function GET() {
  try {
    const settingsPath = path.join(process.cwd(), "public", "platform-settings.json");
    
    // Check if settings file exists
    if (!existsSync(settingsPath)) {
      return NextResponse.json({
        title: "Law Firm Dashboard",
        description: "Professional immigration law firm management system",
      });
    }

    const { readFile } = await import("fs/promises");
    const settingsData = await readFile(settingsPath, "utf-8");
    const settings = JSON.parse(settingsData);

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error loading platform settings:", error);
    return NextResponse.json({
      title: "Law Firm Dashboard",
      description: "Professional immigration law firm management system",
    });
  }
}
