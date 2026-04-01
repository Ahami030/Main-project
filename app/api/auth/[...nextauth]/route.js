import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {},

      async authorize(credentials) {
        const { email, password } = credentials;

        try {
          await connectMongoDB();

          const user = await User.findOne({ email });

          if (!user) return null;

          const passwordMatch = await bcrypt.compare(
            password,
            user.password
          );

          if (!passwordMatch) return null;

          // ✅ ตรงนี้ถูกแล้ว
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.log("Error in authorize:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt", // or "database", depending on your setup
  },

  // ⭐⭐⭐ สำคัญมาก
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // เก็บ _id ลง token
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id; // ส่งไป client
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/Login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
