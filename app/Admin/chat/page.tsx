"use client";

import { useEffect, useRef, useState } from "react";

const USER_ID = "65f123456789abcdef123456"; // 🔥 เปลี่ยนเป็น ObjectId ของ user ที่จะตอบ

type ChatType = {
  _id: string;
  userId: string;
  senderRole: "user" | "admin";
  message: string;
  createdAt: string;
};

export default function AdminPage() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // โหลดแชท
  const loadChats = async () => {
    try {
      const res = await fetch(`/api/chat/${USER_ID}`, {
        cache: "no-store",
      });

      const data = await res.json();
      setChats(data);
    } catch (error) {
      console.error("โหลดแชทล้มเหลว", error);
    }
  };

  // ส่งข้อความ (admin)
  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);

    await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: USER_ID,
        senderRole: "admin",
        message,
      }),
    });

    setMessage("");
    setLoading(false);
    loadChats();
  };

  // Scroll ลงล่าง
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // โหลดครั้งแรก + polling
  useEffect(() => {
    loadChats();

    const interval = setInterval(() => {
      loadChats();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

 
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="p-4 bg-green-600 text-white font-bold text-lg">
        🛠 Admin Chat
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chats.map((chat) => (
          <div
            key={chat._id}
            className={`flex ${
              chat.senderRole === "admin"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-xs break-words ${
                chat.senderRole === "admin"
                  ? "bg-green-500 text-white"
                  : "bg-white border"
              }`}
            >
              {chat.message}
              <div className="text-xs mt-1 opacity-70">
                {new Date(chat.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="พิมพ์ตอบกลับ..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ตอบกลับ
        </button>
      </div>
    </div>
  );
}