import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireEmployee, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import { PRESENCE_TTL_MS, type Editor } from "@/lib/presence";

type Ctx = { params: Promise<{ id: string }> };

// Heartbeat from /Admin/edit/[id]: "I'm (still) on this RFQ". Replies with the OTHER staff
// currently on it so the page can warn about double work.
export async function POST(_req: Request, { params }: Ctx) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const me = getUser(sessionOrRes);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id) || !me.id) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  await connectMongoDB();
  const cutoff = new Date(Date.now() - PRESENCE_TTL_MS);
  // One atomic update: drop my old entry + expired ones, append me with server time.
  // Atomic so two staff heartbeating at once can't overwrite each other's entry.
  // (native driver: Mongoose 9 rejects update pipelines unless opted in)
  const rfq = await RFQ.collection.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id) },
    [{
      $set: {
        editors: {
          $concatArrays: [
            {
              $filter: {
                input: { $ifNull: ["$editors", []] },
                cond: { $and: [{ $ne: ["$$this.id", me.id] }, { $gte: ["$$this.at", cutoff] }] },
              },
            },
            // $literal: a name starting with "$" would otherwise be read as a field path
            [{ id: { $literal: me.id }, name: { $literal: me.name ?? "" }, at: "$$NOW" }],
          ],
        },
      },
    }],
    { returnDocument: "after", projection: { editors: 1 } }
  );
  if (!rfq) return NextResponse.json({ message: "RFQ not found" }, { status: 404 });

  const others = ((rfq.editors ?? []) as Editor[]).filter((e) => e.id !== me.id);
  return NextResponse.json({ others });
}

// Leaving the page (best effort — if it never arrives the entry just expires)
export async function DELETE(_req: Request, { params }: Ctx) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const me = getUser(sessionOrRes);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ message: "Bad request" }, { status: 400 });

  await connectMongoDB();
  await RFQ.updateOne({ _id: id }, { $pull: { editors: { id: me.id } } });
  return NextResponse.json({ ok: true });
}
