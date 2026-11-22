import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    // rfqNumber narrows to one job — a customer can have several RFQs at once
    const rfqNumber = searchParams.get("rfqNumber");

    await connectMongoDB();
    const query: Record<string, string> = {};
    if (userId) query.USER_ID = userId;
    if (rfqNumber) query.rfq_number = rfqNumber;
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