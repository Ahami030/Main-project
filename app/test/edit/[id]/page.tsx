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

        if (!data.line_items) data.line_items = [];

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
  if (error) return <p className="p-5 text-error">Error: {error}</p>;
  if (!form) return <p className="p-5">ไม่พบข้อมูล</p>;

  // ================= CALCULATE =================
  const calculateItemTotal = (q: number, p: number) =>
    (Number(q) || 0) * (Number(p) || 0);

  const calculateGrandTotal = (items: any[]) =>
    items.reduce(
      (sum, item) => sum + calculateItemTotal(item.quantity, item.unit_price),
      0
    );

  const formatPrice = (num: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

  const formatCurrency = (value: number): string => {
    if (value === null || value === undefined) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  };

  const parseCurrency = (value: string): number => {
    const num = parseFloat(value.replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  // ================= HANDLER =================
  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...form.line_items];

    if (field === "description" || field === "unit") {
      updated[index][field] = value;
    } else {
      updated[index][field] = parseCurrency(value);
    }

    setForm({ ...form, line_items: updated });
  };

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
      line_items: [...form.line_items, newItem],
    });
  };

  const removeItem = (index: number) => {
    const updated = form.line_items
      .filter((_: any, i: number) => i !== index)
      .map((item: any, i: number) => ({
        ...item,
        item_number: i + 1,
      }));

    setForm({ ...form, line_items: updated });
  };

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
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const grandTotal = calculateGrandTotal(form.line_items);

  // ================= UI =================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-base-100 min-h-screen">

      {/* ===== LEFT ===== */}
      <div className="lg:col-span-2 space-y-6">

        <h1 className="text-2xl font-bold">Edit RFQ</h1>

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
              onChange={(e) =>
                handleChange("buyer_company_name", e.target.value)
              }
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="card bg-base-200 shadow">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead className="bg-base-300">
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th className="text-center">Qty</th>
                    <th>Unit</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {form.line_items.map((item: any, i: number) => {
                    const total = calculateItemTotal(
                      item.quantity,
                      item.unit_price
                    );

                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>

                        <td>
                          <input
                            value={item.description || ""}
                            onChange={(e) =>
                              handleLineChange(i, "description", e.target.value)
                            }
                            className="input input-sm input-bordered w-full"
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            value={
                              focusedLineField === `${i}-qty`
                                ? item.quantity
                                : formatCurrency(item.quantity)
                            }
                            onFocus={() => setFocusedLineField(`${i}-qty`)}
                            onBlur={() => setFocusedLineField("")}
                            onChange={(e) =>
                              handleLineChange(i, "quantity", e.target.value)
                            }
                            className="input input-sm input-bordered text-center"
                          />
                        </td>

                        <td>
                          <input
                            value={item.unit || ""}
                            onChange={(e) =>
                              handleLineChange(i, "unit", e.target.value)
                            }
                            className="input input-sm input-bordered w-full"
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            value={
                              focusedLineField === `${i}-price`
                                ? item.unit_price
                                : formatCurrency(item.unit_price)
                            }
                            onFocus={() => setFocusedLineField(`${i}-price`)}
                            onBlur={() => setFocusedLineField("")}
                            onChange={(e) =>
                              handleLineChange(i, "unit_price", e.target.value)
                            }
                            className="input input-sm input-bordered text-right"
                          />
                        </td>

                        <td className="text-right text-primary font-semibold">
                          {formatPrice(total)}
                        </td>

                        <td>
                          <button
                            className="btn btn-error btn-xs"
                            onClick={() => removeItem(i)}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="bg-base-300 font-bold">
                    <td colSpan={5} className="text-right">
                      Grand Total
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
        <div className="flex gap-3">
          <button className="btn btn-primary btn-sm" onClick={addItem}>
            + เพิ่มรายการ
          </button>

          <div className="ml-auto flex gap-2">
            <button className="btn btn-success" onClick={handleSubmit}>
              Save
            </button>

            <button
              className="btn btn-outline"
              onClick={() => router.push("/test/rfq")}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ===== RIGHT (PDF) ===== */}
      <div className="lg:col-span-1">
        <div className="card bg-base-200 shadow h-full">
          <div className="card-body p-2">
            <h2 className="font-bold">📄 PDF Preview</h2>

            {form.filename ? (
              <iframe
                src={`/api/pdf/view?filename=${form.filename}`}
                className="w-full h-[80vh] rounded"
              />
            ) : (
              <div className="flex items-center justify-center h-[80vh] text-base-content/60">
                ไม่มีไฟล์ PDF
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}