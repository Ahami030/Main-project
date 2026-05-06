import NextAuth, { AuthOptions } from "next-auth"; // ⭐ เพิ่ม AuthOptions
import CredentialsProvider from "next-auth/providers/credentials";
import { connectMongoDB } from "@/lib/mongo";
import User from "@/app/models/User";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = { // ⭐ เพิ่ม : AuthOptions
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {},

      async authorize(credentials) {
        const { email, password } = credentials as { 
          email: string; 
          password: string; 
        };

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
          };
        } catch (error) {
          console.log("Error in authorize:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt", // ⭐ ไม่ต้องใส่ as const แล้วเพราะมี AuthOptions
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
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