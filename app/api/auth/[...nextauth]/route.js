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

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions ?? [],
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions ?? [];
      }
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.name = token.name;
        session.user.permissions = token.permissions ?? [];
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
