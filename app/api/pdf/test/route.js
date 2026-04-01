import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PDF from "@/app/models/PDF";

export async function POST() {
  const session = await getServerSession(authOptions);

  console.log("SESSION =", session);
  

  if (!session) {
    return NextResponse.json(
      { message: "No session" },
      { status: 401 }
    );
  }

  await connectMongoDB();

  const data = await PDF.create({
    userId: session.user.id,
    filename: "test-session",
    path: "no-file",
  });

  return NextResponse.json({
    message: "Session saved",
    data,
  });
}
