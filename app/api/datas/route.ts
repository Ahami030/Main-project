// import { NextRequest, NextResponse } from 'next/server';
// import { ObjectId } from 'mongodb';
// import clientPromise from '@/test/mongo/mongodb5';

// // GET: ดึงข้อมูลทั้งหมด
// export async function GET() {
//   const client = await clientPromise;
//   const db = client.db();
//   const datas = await db.collection('datas').find({}).toArray();
//   return NextResponse.json(datas);
// }

// // POST: เพิ่มข้อมูลใหม่
// export async function POST(req: NextRequest) {
//   const body = await req.json();
//   const client = await clientPromise;
//   const db = client.db();
//   const result = await db.collection('datas').insertOne(body);
//   return NextResponse.json({ insertedId: result.insertedId });
// }

// // PUT: อัปเดตข้อมูล
// export async function PUT(req: NextRequest) {
//   const id = req.nextUrl.searchParams.get('id');
//   const body = await req.json();

//   if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

//   const client = await clientPromise;
//   const db = client.db();
//   const result = await db.collection('datas').updateOne(
//     { _id: new ObjectId(id) },
//     { $set: body }
//   );

//   return NextResponse.json({ updated: result.modifiedCount });
// }

// // DELETE: ลบข้อมูล
// export async function DELETE(req: NextRequest) {
//   const id = req.nextUrl.searchParams.get('id');

//   if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

//   const client = await clientPromise;
//   const db = client.db();
//   const result = await db.collection('datas').deleteOne({ _id: new ObjectId(id) });

//   return NextResponse.json({ deleted: result.deletedCount });
// }
