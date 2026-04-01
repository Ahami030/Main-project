"use client";
import React, { useEffect, useState } from "react";
import { JSX } from "react/jsx-runtime";




/**
 * Simple Next.js (app router) client page that integrates Tailwind + daisyUI themes.
 * Save this file as: /d:/React Project/my-project/test/app/Client/quotation/page.tsx
 *
 * - Uses data-theme on <html> to switch daisyUI themes
 * - Persists selection in localStorage
 * - Demo card + form showing daisyUI components
 */

const THEMES = [
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "dracula",
];

function applyTheme(theme: string) {
    if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
    }
}

export default function Page(): JSX.Element {
    const [theme, setTheme] = useState<string>("light");
    const [name, setName] = useState<string>("");

    useEffect(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem("daisy-theme") : null;
        if (saved) {
            setTheme(saved);
            applyTheme(saved);
        } else {
            applyTheme(theme);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        applyTheme(theme);
        try {
            localStorage.setItem("daisy-theme", theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    return (
        <main className="min-h-screen bg-base-200 p-6">
            <header className="max-w-4xl mx-auto mb-6">
                <nav className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Quotation — Theme demo</h1>

                    <div className="flex items-center gap-3">
                        <label className="text-sm hidden sm:block">Theme</label>

                        <select
                            aria-label="Select daisyUI theme"
                            className="select select-bordered select-sm w-40"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                        >
                            {THEMES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                // quick toggle light <-> dark fallback
                                setTheme((cur) => (cur === "dark" ? "light" : "dark"));
                            }}
                            title="Toggle light/dark"
                        >
                            Toggle
                        </button>
                    </div>
                </nav>
            </header>

            <section className="max-w-4xl mx-auto grid gap-6">
                <article className="card bg-base-100 shadow-md">
                    <div className="card-body">
                        <h2 className="card-title">Sample quotation card</h2>
                        <p>
                            This is a small demo showing how daisyUI themes affect components. Change the theme
                            from the selector above to see the styles update.
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                            <button className="btn btn-primary">Primary</button>
                            <button className="btn btn-secondary">Secondary</button>
                            <button className="btn btn-accent">Accent</button>
                            <button className="btn btn-outline">Outline</button>
                        </div>
                    </div>
                </article>

                <article className="card bg-base-100 shadow">
                    <div className="card-body">
                        <h3 className="font-semibold">Create a quick quote</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                            <input
                                className="input input-bordered w-full"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <select className="select select-bordered w-full">
                                <option>Product A</option>
                                <option>Product B</option>
                                <option>Service C</option>
                            </select>
                        </div>

                        <textarea
                            className="textarea textarea-bordered w-full mt-3"
                            placeholder="Short description (optional)"
                            rows={3}
                        />

                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <span className="text-sm text-muted">Current theme:</span>
                                <span className="ml-2 badge badge-ghost">{theme}</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    className="btn btn-sm"
                                    onClick={() => {
                                        // simple "submit" mock
                                        alert(`Quote requested by ${name || "anonymous"} (theme: ${theme})`);
                                    }}
                                >
                                    Request Quote
                                </button>
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => {
                                        setName("");
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </article>
            </section>
        </main>
    );
}