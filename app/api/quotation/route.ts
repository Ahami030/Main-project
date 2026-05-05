import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@/lib/mongo";
import PDF from "@/app/models/PDF";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    };
  }
}

const N8N_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ??
  "http://localhost:5678/webhook-test/pdf-test";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const data = await req.formData();
  const file = data.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "No file" }, { status: 400 });
  }

  // ✅ Accept only PDF
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { message: "Only PDF allowed" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filename = `${Date.now()}-${file.name}`;
  const filePath = path.join(process.cwd(), "PDF", filename);

  // ✅ Save file to PDF folder
  await writeFile(filePath, buffer);

  // ✅ Save to MongoDB
  await connectMongoDB();
  const pdfRecord = await PDF.create({
    userId: session.user.id,
    filename,
    path: `/PDF/${filename}`,
  });

  // ✅ Send to n8n webhook
  try {
    const n8nFormData = new FormData();
    n8nFormData.append("file", file);
    n8nFormData.append("userId", session.user.id);
    n8nFormData.append("filename", filename);

    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: n8nFormData,
    });

    const n8nJson = await n8nRes.json();

    return NextResponse.json({
      message: "Upload successful",
      filename,
      userId: session.user.id,
      pdfRecord,
      n8nResponse: n8nJson,
    });
  } catch (error) {
    // Still return success since file was saved to DB and folder
    return NextResponse.json({
      message: "File saved to database and folder, but n8n webhook failed",
      filename,
      userId: session.user.id,
      pdfRecord,
      error: (error as Error).message,
    });
  }
}
