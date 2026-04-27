// app/api/chat/users/route.ts
import { NextResponse } from "next/server";
import Chat from "@/models/Chat";
import User from "@/app/models/User";
import { connectMongoDB } from "@/lib/mongo";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectMongoDB();

    // Get distinct userIds from chats where senderRole is "user"
    const userIds = await Chat.distinct("userId", {
      senderRole: "user",
    });

    // For each userId, get the latest message and user info
    const usersWithChats = await Promise.all(
      userIds.map(async (userId) => {
        // Get latest message from this user
        const latestChat = await Chat.findOne({ userId }).sort({
          createdAt: -1,
        });

        // Get user info
        const user = await User.findById(userId).lean();

        return {
          userId: userId.toString(),
          user: user ? { name: user.name, email: user.email } : null,
          latestMessage: latestChat?.message || "",
          latestMessageTime: latestChat?.createdAt || new Date(),
        };
      })
    );

    // Sort by latest message time (descending)
    const sortedUsers = usersWithChats.sort((a, b) => {
      const timeA = new Date(a.latestMessageTime).getTime();
      const timeB = new Date(b.latestMessageTime).getTime();
      return timeB - timeA;
    });

    return NextResponse.json(sortedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
