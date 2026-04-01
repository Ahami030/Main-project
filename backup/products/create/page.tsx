"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
  });

  async function handleSubmit(e: any) {
    e.preventDefault();

    await fetch("/api/products", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
      }),
    });

    router.push("/products");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Name"
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="Price"
        onChange={(e) => setForm({ ...form, price: e.target.value })}
      />
      <textarea
        placeholder="Description"
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <button type="submit">Create</button>
    </form>
  );
}
