import React from "react";

export default function Footer() {
  return (
    <footer className="footer footer-center p-8 bg-base-300 text-base-content">
      <div className="space-y-2">
        <p className="font-semibold">
          My Tailwind + daisyUI Project
        </p>

        <p className="text-sm opacity-70">
          Built with Next.js, Tailwind CSS and daisyUI
        </p>

        <p className="text-xs opacity-50">
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </footer>
  );
}
