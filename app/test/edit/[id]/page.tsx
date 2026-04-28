"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditPage() {
  const { id } = useParams();
  const router = useRouter();

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/rfq/${id}`);
        if (!res.ok) throw new Error("Failed to fetch");
        let data = await res.json();
        
        // Ensure line_items is always an array
        if (!data.line_items) {
          data.line_items = [];
        }
        
        setForm(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) return <p className="p-5">กำลังโหลด...</p>;
  if (error) return <p className="p-5 text-red-500">Error: {error}</p>;
  if (!form) return <p className="p-5">ไม่พบข้อมูล</p>;

  // update field
  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  // update line item
  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...form.line_items];
    updated[index][field] = value;
    setForm({ ...form, line_items: updated });
  };

  // add item
  const addItem = () => {
    setForm({
      ...form,
      line_items: [
        ...form.line_items,
        { item_number: form.line_items.length + 1, description: "", quantity: 1, unit: "", unit_price: 0 }
      ]
    });
  };

  // remove item
  const removeItem = (index: number) => {
    const updated = form.line_items.filter((_: any, i: number) => i !== index);
    setForm({ ...form, line_items: updated });
  };

  // save
  const handleSubmit = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/rfq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save");
      
      alert("บันทึกสำเร็จ!");
      router.push("/test/rfq");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-bold">Edit RFQ</h1>

      <input
        className="input input-bordered w-full"
        placeholder="RFQ Number"
        value={form.rfq_number || ""}
        onChange={(e) => handleChange("rfq_number", e.target.value)}
      />

      <input
        className="input input-bordered w-full"
        placeholder="Buyer Company"
        value={form.buyer_company_name || ""}
        onChange={(e) => handleChange("buyer_company_name", e.target.value)}
      />

      {/* LINE ITEMS */}
      <div>
        <h2 className="font-bold mb-2">Line Items</h2>

        {form.line_items && form.line_items.length > 0 ? (
          form.line_items.map((item: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={item.description || ""}
                onChange={(e) => handleLineChange(i, "description", e.target.value)}
                className="input input-bordered flex-1"
                placeholder="Description"
              />
              <input
                type="number"
                value={item.quantity || 0}
                onChange={(e) => handleLineChange(i, "quantity", Number(e.target.value))}
                className="input input-bordered w-20"
                placeholder="Qty"
              />
              <input
                value={item.unit || ""}
                onChange={(e) => handleLineChange(i, "unit", e.target.value)}
                className="input input-bordered w-20"
                placeholder="Unit"
              />
              <input
                type="number"
                value={item.unit_price || 0}
                onChange={(e) => handleLineChange(i, "unit_price", Number(e.target.value))}
                className="input input-bordered w-24"
                placeholder="Price"
              />

              <button
                className="btn btn-error btn-sm"
                onClick={() => removeItem(i)}
                disabled={saving}
              >
                ลบ
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm mb-2">ยังไม่มีรายการ</p>
        )}

        <button 
          className="btn btn-primary btn-sm mt-2" 
          onClick={addItem}
          disabled={saving}
        >
          + เพิ่มรายการ
        </button>
      </div>

      <button 
        className="btn btn-success" 
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "กำลังบันทึก..." : "Save"}
      </button>
    </div>
  );
}