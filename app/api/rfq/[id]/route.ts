import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import { findQuotationForRfq } from "@/app/models/Quotation";
import { NextResponse } from "next/server";
import { requireEmployee, getUser } from "@/lib/apiAuth";

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
  // staff only — and the session says who did the work (staff stats)
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const staff = getUser(sessionOrRes);

  try {
    const { id } = await params;
    const body = await req.json();
    await connectMongoDB();

    // editors = live presence list owned by /presence — never overwrite it from a stale form
    const { version: _v, _id: _id_, __v, createdAt, updatedAt, editors: _editors, ...rfqData } = body;

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

    const quotation = await findQuotationForRfq(updated);
    if (quotation) {
      quotation.status = "bargaining";
      // credit the staff member who first sent this quotation to the customer — re-saves
      // during bargaining don't count again (one job = one point)
      if (!quotation.handledBy?.id && staff.id) {
        quotation.handledBy = { id: staff.id, name: staff.name ?? "" };
        quotation.handledAt = new Date();
      }
      await quotation.save();
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