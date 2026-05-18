import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    await connectMongoDB();
    const query = userId ? { USER_ID: userId } : {};
    const data = await RFQ.find(query).sort({ createdAt: -1 });
    return NextResponse.json(data, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET /api/rfq error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQ" },
      { status: 500 }
    );
  }
}