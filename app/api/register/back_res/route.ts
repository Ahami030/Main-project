import { NextResponse } from 'next/server';
import clientPromise from "@/test/mongo/mongodb5";
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ รอให้ client เชื่อมต่อสำเร็จ
    const client = await clientPromise;
    const db = client.db("mydb");          // ชื่อ database ตรงกับใน Compass
    const users = db.collection("user");   // ชื่อ collection ใน mydb

    // ✅ ตรวจสอบว่า email ซ้ำไหม
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already exists' },
        { status: 400 }
      );
    }

    // ✅ เพิ่มข้อมูลใหม่
    await users.insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    console.log("✅ Registered:", name, email);

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
