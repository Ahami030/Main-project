"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface Props {
  session: Session | null;
  status: string;
}

export default function UserMenu({ session, status }: Props) {
  if (status === "loading") {
    return <span className="text-sm text-base-content/60">Loading...</span>;
  }

  if (!session) {
    return (
      <Link href="/api/auth/signin" className="btn btn-primary btn-sm">
        Sign in
      </Link>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
        {session.user?.image ? (
          <div className="w-10 rounded-full">
            <img src={session.user.image} alt="user" />
          </div>
        ) : (
          <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold">
            {session.user?.name?.charAt(0)}
          </div>
        )}
      </label>

      <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
        <li className="menu-title text-xs opacity-60">{session.user?.email}</li>
        <li>
          <Link href="/profile">Profile</Link>
        </li>
        <li>
          <button onClick={() => signOut()} className="text-error">
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
}
