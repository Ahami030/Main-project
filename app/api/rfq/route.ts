import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectMongoDB();
    const data = await RFQ.find();
    return NextResponse.json(data, { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("GET /api/rfq error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQ" },
      { status: 500 }
    );
  }
}