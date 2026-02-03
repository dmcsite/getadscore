import { NextRequest, NextResponse } from "next/server";
import { findContact } from "@/lib/hunter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, titles } = body;

    // Validate input
    if (!domain) {
      return NextResponse.json(
        { error: "domain is required" },
        { status: 400 }
      );
    }

    // Clean domain (remove protocol if included)
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    // Use provided titles or default to the ones in findContact
    const contact = await findContact(
      cleanDomain,
      titles && titles.length > 0 ? titles : undefined
    );

    if (!contact) {
      return NextResponse.json({
        success: true,
        found: false,
        message: "No contacts found for this domain",
      });
    }

    return NextResponse.json({
      success: true,
      found: true,
      name: contact.name,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      email: contact.email,
      linkedin: contact.linkedin,
      confidence: contact.confidence,
    });
  } catch (error) {
    console.error("Hunter find-contact error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to find contact" },
      { status: 500 }
    );
  }
}
