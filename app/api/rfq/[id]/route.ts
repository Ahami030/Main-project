import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import Quotation from "@/app/models/Quotation";
import { NextResponse } from "next/server";

type ChangeLogEntry = {
  index: number;
  is_new: boolean;
  changed_fields: string[];
};

function computeChangeLog(oldItems: any[], newItems: any[]): ChangeLogEntry[] {
  const log: ChangeLogEntry[] = [];
  for (let i = 0; i < newItems.length; i++) {
    if (i >= oldItems.length) {
      log.push({ index: i, is_new: true, changed_fields: [] });
    } else {
      const old = oldItems[i];
      const nw = newItems[i];
      const changed: string[] = [];
      if (String(old.description ?? "") !== String(nw.description ?? "")) changed.push("description");
      if (Number(old.quantity ?? 0) !== Number(nw.quantity ?? 0)) changed.push("quantity");
      if (String(old.unit ?? "") !== String(nw.unit ?? "")) changed.push("unit");
      if (Number(old.unit_price ?? 0) !== Number(nw.unit_price ?? 0)) changed.push("unit_price");
      if (changed.length > 0) log.push({ index: i, is_new: false, changed_fields: changed });
    }
  }
  return log;
}

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

    const { version: _v, _id: _id_, __v, createdAt, updatedAt, ...rfqData } = body;

    const existing = await RFQ.findById(id).lean();
    let changeLog: ChangeLogEntry[] = [];
    if (existing && (existing.version ?? 0) > 0) {
      changeLog = computeChangeLog((existing as any).line_items ?? [], rfqData.line_items ?? []);
    }

    const updated = await RFQ.findByIdAndUpdate(
      id,
      { $set: { ...rfqData, change_log: changeLog }, $inc: { version: 1 } },
      { new: true, strict: false }
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