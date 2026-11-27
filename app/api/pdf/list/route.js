import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PDF from "@/app/models/PDF";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  await connectMongoDB();

  const filter = session.user.role === "admin" ? {} : { userId: session.user.id };
  const pdfs = await PDF.find(filter).sort({ uploadDate: -1 });

  return NextResponse.json(pdfs);
}
