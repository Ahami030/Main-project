import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";

export async function POST(request: Request) {
  try {
    
    await connectMongoDB();
    const { email } = await request.json();
    const user = await User.findOne({ email }, "_id");
    console.log("✅ Checked user:", email, user);
    return NextResponse.json({ user });

  } catch (error) {
    console.error("Error during user check:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
