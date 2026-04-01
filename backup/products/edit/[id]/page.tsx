"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditPage() {
  const router = useRouter();
  const params = useParams();

  const id = params?.id as string;

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);

        if (!res.ok) {
          console.error("Fetch failed");
          return;
        }

        const data = await res.json();

        console.log("Fetched:", data);

        if (data) {
          setForm(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!form) return <div>Product not found</div>;

  async function handleSubmit(e: any) {
    e.preventDefault();

    await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
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
        value={form.name || ""}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      <input
        value={form.price || ""}
        onChange={(e) => setForm({ ...form, price: e.target.value })}
      />

      <textarea
        value={form.description || ""}
        onChange={(e) =>
          setForm({ ...form, description: e.target.value })
        }
      />

      <button type="submit">Update</button>
    </form>
  );
}
