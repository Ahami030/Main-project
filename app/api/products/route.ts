import { connectMongoDB } from "@/lib/mongo";
import { Product } from "@/app/models/Product";
import { NextResponse } from "next/server";

export async function GET() {
  await connectMongoDB();
  const products = await Product.find();
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  await connectMongoDB();
  const body = await req.json();
  const product = await Product.create(body);
  return NextResponse.json(product);
}
