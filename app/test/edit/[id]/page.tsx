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
  const [focusedLineField, setFocusedLineField] = useState<string>("");

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

  // Calculate item total
  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    const q = Number(quantity) || 0;
    const p = Number(unitPrice) || 0;
    return q * p;
  };

  // Calculate grand total
  const calculateGrandTotal = (lineItems: any[]) => {
    return lineItems.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item.quantity, item.unit_price);
      return sum + itemTotal;
    }, 0);
  };

  // Format number with thousand separator and 2 decimals
  const formatPrice = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format for currency input (with commas)
  const formatCurrency = (value: number): string => {
    if (value === null || value === undefined) return "";
    const num = Number(value) || 0;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Parse currency string to number (remove commas)
  const parseCurrency = (value: string): number => {
    if (!value || value === "") return 0;
    const num = parseFloat(value.replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  // update field
  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  // update line item
  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...form.line_items];
    if (field === "description" || field === "unit") {
      updated[index][field] = value;
    } else if (field === "unit_price" || field === "quantity") {
      updated[index][field] = parseCurrency(value);
    } else {
      updated[index][field] = Number(value) || 0;
    }
    setForm({ ...form, line_items: updated });
  };

  // add item
  const addItem = () => {
    const newItem = {
      item_number: form.line_items.length + 1,
      description: "",
      quantity: 1,
      unit: "",
      unit_price: 0,
    };
    setForm({
      ...form,
      line_items: [...form.line_items, newItem]
    });
  };

  // remove item and re-number
  const removeItem = (index: number) => {
    const updated = form.line_items
      .filter((_: any, i: number) => i !== index)
      .map((item: any, i: number) => ({
        ...item,
        item_number: i + 1
      }));
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

  const grandTotal = calculateGrandTotal(form.line_items || []);

  return (
  <div className="p-6 space-y-6 bg-base-100 min-h-screen">
    <h1 className="text-2xl font-bold text-base-content">Edit RFQ</h1>

    {/* FORM */}
    <div className="card bg-base-200 shadow">
      <div className="card-body gap-4">
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
      </div>
    </div>

    {/* TABLE */}
    <div className="card bg-base-200 shadow">
      <div className="card-body p-0">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead className="bg-base-300 text-base-content">
              <tr>
                <th className="text-center">#</th>
                <th>Description</th>
                <th className="text-center">Qty</th>
                <th>Unit</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Total</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {form.line_items?.length > 0 ? (
                form.line_items.map((item: any, i: number) => {
                  const itemTotal = calculateItemTotal(item.quantity, item.unit_price);

                  return (
                    <tr key={i}>
                      <td className="text-center font-semibold">{i + 1}</td>

                      <td>
                        <input
                          value={item.description || ""}
                          onChange={(e) =>
                            handleLineChange(i, "description", e.target.value)
                          }
                          className="input input-bordered input-sm w-full"
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            focusedLineField === `${i}-quantity`
                              ? String(item.quantity || "")
                              : formatCurrency(item.quantity || 0)
                          }
                          onChange={(e) =>
                            handleLineChange(i, "quantity", e.target.value)
                          }
                          onFocus={() => setFocusedLineField(`${i}-quantity`)}
                          onBlur={() => setFocusedLineField("")}
                          className="input input-bordered input-sm w-full text-center"
                        />
                      </td>

                      <td>
                        <input
                          value={item.unit || ""}
                          onChange={(e) =>
                            handleLineChange(i, "unit", e.target.value)
                          }
                          className="input input-bordered input-sm w-full"
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            focusedLineField === `${i}-unit_price`
                              ? String(item.unit_price || "")
                              : formatCurrency(item.unit_price || 0)
                          }
                          onChange={(e) =>
                            handleLineChange(i, "unit_price", e.target.value)
                          }
                          onFocus={() => setFocusedLineField(`${i}-unit_price`)}
                          onBlur={() => setFocusedLineField("")}
                          className="input input-bordered input-sm w-full text-right"
                        />
                      </td>

                      <td className="text-right font-semibold text-primary">
                        {formatPrice(itemTotal)}
                      </td>

                      <td className="text-center">
                        <button
                          className="btn btn-error btn-xs"
                          onClick={() => removeItem(i)}
                          disabled={saving}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-base-content/60">
                    ยังไม่มีรายการ
                  </td>
                </tr>
              )}
            </tbody>

            {/* FOOTER */}
            <tfoot>
              <tr className="bg-base-300 font-bold text-lg">
                <td colSpan={5} className="text-right pr-4">
                  Grand Total:
                </td>
                <td className="text-right text-success">
                  {formatPrice(grandTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    {/* ACTION */}
    <div className="flex flex-wrap gap-3">
      <button
        className="btn btn-primary btn-sm"
        onClick={addItem}
        disabled={saving}
      >
        + เพิ่มรายการ
      </button>

      <div className="flex gap-2 ml-auto">
        <button
          className="btn btn-success"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "กำลังบันทึก..." : "Save"}
        </button>

        <button
          className="btn btn-outline"
          onClick={() => router.push("/test/rfq")}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);
}