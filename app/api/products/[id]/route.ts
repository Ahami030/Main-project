import { connectMongoDB } from "@/lib/mongo";
import { Product } from "@/app/models/Product";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function getId(context: RouteContext) {
  const resolvedParams = await context.params;
  return resolvedParams?.id;
}

export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ success: false, message: "Invalid product id" }, { status: 400 });
    }

    await connectMongoDB();
    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch product", error }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: RouteContext
) {
  try {
    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ success: false, message: "Invalid product id" }, { status: 400 });
    }

    await connectMongoDB();
    const body = await req.json();
    const updated = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to update product", error }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: RouteContext
) {
  try {
    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ success: false, message: "Invalid product id" }, { status: 400 });
    }

    await connectMongoDB();
    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to delete product", error }, { status: 500 });
  }
}
