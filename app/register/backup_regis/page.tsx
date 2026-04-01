"use client";
import Link from "next/link";
import { useState } from "react";
 <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (!name || !email || !password) {
      setErrorMessage("All fields are required");
      return;
    }

    setErrorMessage("");
    setMessage("Register successful!");
    console.log({ name, email, password });

    try {
      const resCheckuser = await fetch("http://localhost:3000/api/checkUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const dataCheck = await resCheckuser.json();

      if (dataCheck.user) {
        setErrorMessage("Email already exists");
        return;
      }

      const res = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const form = e.target as HTMLFormElement;
        setErrorMessage("");
        setSuccessMessage("Registration successful!");
        form.reset();
      } else {
        setErrorMessage("Registration failed");
      }
    } catch (error) {
      console.error("Error during registration:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded">
      <h1 className="text-2xl font-bold mb-6">Register</h1>
      <form onSubmit={handleSubmit}>
        {errorMessage && (
          <div className="text-red-500 mb-4">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="text-green-500 mb-4">{successMessage}</div>
        )}
        {/* {message && (<div className="text-green-500 mb-4">{message}</div>)} */}

        <div className="mb-4">
          <label className="block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          Register
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/Login">
          <button className="px-4 py-2 bg-green-600 text-white rounded">
            ไปยังหน้า Login
          </button>
        </Link>
      </div>
    </div>
  );
}

export default RegisterPage;
