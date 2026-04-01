"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProductPage() {
  const [products, setProducts] = useState<any[]>([]);

  async function fetchProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });
    fetchProducts();
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div>
      <h1>Product List</h1>
      <Link href="/products/create">Create New</Link>

      {products.map((p) => (
        <div key={p._id}>
          <h3>{p.name}</h3>
          <p>{p.price}</p>
          <Link href={`/products/edit/${p._id}`}>Edit</Link>
          <button onClick={() => handleDelete(p._id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
