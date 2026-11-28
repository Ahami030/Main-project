import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireEmployee, getUser } from "@/lib/apiAuth";
import { connectMongoDB } from "@/lib/mongo";
import RFQ from "@/app/models/RFQ";
import { PRESENCE_TTL_MS, PRESENCE_AWAY_TTL_MS, type Editor } from "@/lib/presence";

type Ctx = { params: Promise<{ id: string }> };

// Claim from /Admin/edit/[id]: "I'm on this RFQ" ({ away: false }, sent on open, on return
// to the tab and every 30s while visible) or "my tab is hidden" ({ away: true }, sent once).
// Replies with the OTHER staff holding it so the page can warn about double work.
export async function POST(req: Request, { params }: Ctx) {
  const sessionOrRes = await requireEmployee("quotation");
  if (sessionOrRes instanceof NextResponse) return sessionOrRes;
  const me = getUser(sessionOrRes);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id) || !me.id) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { away?: boolean } | null;
  const away = body?.away === true;

  await connectMongoDB();
  const now = Date.now();
  const liveCutoff = new Date(now - PRESENCE_TTL_MS);
  const awayCutoff = new Date(now - PRESENCE_AWAY_TTL_MS);
  const editors = { $ifNull: ["$editors", []] };
  const isMine = { $eq: ["$$this.id", { $literal: me.id }] };
  // same rule as activeEditors() in lib/presence.ts
  const isFresh = { $gte: ["$$this.at", { $cond: [{ $eq: ["$$this.away", true] }, awayCutoff, liveCutoff] }] };
  const others = { $filter: { input: editors, cond: { $and: [{ $not: [isMine] }, isFresh] } } };

  // claim: replace my entry. away: only UPDATE my existing entry, never add one — closing the
  // tab fires "hidden" then DELETE, and if they land in reverse order the claim must stay gone.
  const mine = away
    ? {
        $map: {
          input: { $filter: { input: editors, cond: isMine } },
          in: { id: "$$this.id", name: "$$this.name", at: "$$NOW", away: true },
        },
      }
    // $literal: a name starting with "$" would otherwise be read as a field path
    : [{ id: { $literal: me.id }, name: { $literal: me.name ?? "" }, at: "$$NOW", away: false }];

  // One atomic update so two staff signalling at once can't overwrite each other's entry.
  // (native driver: Mongoose 9 rejects update pipelines unless opted in)
  const rfq = await RFQ.collection.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id) },
    [{ $set: { editors: { $concatArrays: [others, mine] } } }],
    { returnDocument: "after", projection: { editors: 1 } }
  );
  if (!rfq) return NextResponse.json({ message: "RFQ not found" }, { status: 404 });

  return NextResponse.json({ others: ((rfq.editors ?? []) as Editor[]).filter((e) => e.id !== me.id) });
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
