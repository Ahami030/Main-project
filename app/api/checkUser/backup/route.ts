import { NextResponse } from 'next/server';
import clientPromise from "@/test/mongo/mongodb5";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // ✅ เชื่อมต่อฐานข้อมูล
    const client = await clientPromise;
    const db = client.db("mydb");          // ชื่อ database
    const users = db.collection("user");   // ชื่อ collection

    // ✅ ค้นหาผู้ใช้ตาม email (เลือกเฉพาะ _id)
    const foundUser = await users.findOne(
      { email },
      { projection: { _id: 1 } }           // ใช้ projection แทน select()
    );

    console.log("✅ Checked user:", email, foundUser);

    // ✅ ส่งผลลัพธ์กลับ
    return NextResponse.json({ user: foundUser });
  } catch (error) {
    console.error('Error during user check:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );  
  }
}
