"use client";

import React, { JSX } from "react";
import { useSession } from "next-auth/react";


export default function Page(): JSX.Element {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-6">

        {/* User Card */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title">
              Welcome "{session?.user?.name ?? "Guest"}"
            </h2>

            <div className="text-sm opacity-70 space-y-1">
              <p>You are logged in as {session?.user?.email}</p>
              <p>
                Your id is:{" "}
                {(session?.user as { id?: string })?.id ?? "User"}
              </p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="md:flex md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold">
                  Build with Tailwind CSS
                </h2>

                <p className="mt-2 opacity-70">
                  A simple page scaffolded with Tailwind.
                  Responsive, accessible, and easy to customize.
                </p>

                <div className="mt-4 flex gap-3">
                  <button className="btn btn-primary">
                    Get started
                  </button>

                  <button className="btn btn-outline">
                    Learn more
                  </button>
                </div>
              </div>

              <div className="mt-6 md:mt-0  rounded-lg bg-base-300 flex items-center justify-center">
                <div className="w-56 h-36 rounded-xl bg-base-300 flex items-center justify-center font-medium shadow-inner ">
                  Hero Image
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {["Fast", "Responsive", "Customizable"].map((title) => (
            <div key={title} className="card bg-base-100 shadow-sm hover:shadow-md transition">
              <div className="card-body">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm opacity-70">
                  Short description about {title.toLowerCase()} features.
                </p>
                <div className="card-actions justify-end">
                  <div className="badge badge-primary badge-outline">
                    Feature
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      
    </main>
  );
}
