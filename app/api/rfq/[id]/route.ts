import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import Quotation from "@/app/models/Quotation";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: any) {
  try {
    const { id } = await params;
    await connectMongoDB();
    const data = await RFQ.findById(id);
    if (!data) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(data, { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("GET /api/rfq/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RFQ" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: any) {
  try {
    const { id } = await params;
    const body = await req.json();
    await connectMongoDB();
    
    const updated = await RFQ.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );
    
    if (!updated) {
      return NextResponse.json(
        { error: "RFQ not found" },
        { status: 404 }
      );
    }

    if (updated.USER_ID) {
      await Quotation.findOneAndUpdate(
        { userId: updated.USER_ID },
        { status: "bargaining" }
      );
    }

    return NextResponse.json(updated, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("PUT /api/rfq/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update RFQ" },
      { status: 500 }
    );
  }
}