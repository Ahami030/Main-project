'use client';
import { useEffect, useState } from 'react';




export default function AdminPage() {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <div className="min-h-screen bg-base-100">
            <nav className="navbar bg-base-200 shadow-lg">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl">Admin Panel</a>
                </div>
                <div className="flex-none gap-2">
                    <button
                        onClick={toggleTheme}
                        className="btn btn-square btn-ghost"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
            </nav>

            <main className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Users</h2>
                            <p>Manage users</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary">View</button>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Settings</h2>
                            <p>Configure system</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary">View</button>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Reports</h2>
                            <p>View analytics</p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary">View</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}