import React, { JSX } from "react";

export default function Page(): JSX.Element {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center font-sans p-6 gap-3 ">
            <h1 className="m-0">Hello from the simple page</h1>
            <p className="m-0 text-gray-700">
                This is a minimal Next.js page component (TypeScript + React).
            </p>
            <button className="btn btn-primary">Primary</button>
        </main>
    );
}
