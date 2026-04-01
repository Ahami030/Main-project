import {NextResponse} from 'next/server';
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";
import bcrypt from 'bcryptjs';
export async function POST(request: Request) {
  try {
    await connectMongoDB();
    const {name, email, password} = await request.json();

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword,});

    console.log("✅ Registered:", name, email);
    return NextResponse.json(
      {message: 'User registered successfully'},
      {status: 200}
    );
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      {message: 'Internal Server Error'},
      {status: 500}
    );
  }
}