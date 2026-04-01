'use client';

import { useState, useEffect } from 'react';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    inStock: true,
  });

  // ดึงข้อมูล products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload : payload?.data;
      if (res.ok && Array.isArray(list)) {
        setProducts(list);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // จัดการ form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct._id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok && (data?.success ?? true)) {
        await fetchProducts();
        resetForm();
        alert(editingProduct ? 'อัพเดทสำเร็จ!' : 'เพิ่มสินค้าสำเร็จ!');
      }
      else {
        alert(data?.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('เกิดข้อผิดพลาด!');
    }
  };

  // ลบ product
  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) return;
    
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (res.ok && (data?.success ?? true)) {
        await fetchProducts();
        alert('ลบสินค้าสำเร็จ!');
      }
      else {
        alert(data?.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('เกิดข้อผิดพลาด!');
    }
  };

  // แก้ไข product
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      inStock: product.inStock,
    });
    setShowForm(true);
  };

  // รีเซ็ต form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      inStock: true,
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-base-200 p-8 text-base-content">
  <div className="max-w-6xl mx-auto space-y-8">

    {/* Header */}
    <div className="flex justify-between items-center">
      <h1 className="text-4xl font-bold">
        ระบบจัดการสินค้า (Products CRUD)
      </h1>

      <button
        onClick={() => setShowForm(!showForm)}
        className="btn btn-primary"
      >
        {showForm ? "ซ่อนฟอร์ม" : "เพิ่มสินค้า"}
      </button>
    </div>

    {/* Form */}
    {showForm && (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-2xl">
            {editingProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="form-control">
              <label className="label">
                <span className="label-text">ชื่อสินค้า</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">รายละเอียด</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="textarea textarea-bordered w-full"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="form-control">
                <label className="label">
                  <span className="label-text">ราคา (บาท)</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">หมวดหมู่</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="input input-bordered w-full"
                />
              </div>

            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.inStock}
                  onChange={(e) =>
                    setFormData({ ...formData, inStock: e.target.checked })
                  }
                  className="checkbox checkbox-primary"
                />
                <span className="label-text">มีสินค้าในสต็อก</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="btn btn-success">
                {editingProduct ? "อัพเดท" : "บันทึก"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="btn btn-ghost"
              >
                ยกเลิก
              </button>
            </div>

          </form>
        </div>
      </div>
    )}

    {/* Products List */}
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">

        <h2 className="card-title text-2xl">
          รายการสินค้า ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="py-10 text-center opacity-60">
            ยังไม่มีสินค้า
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>รายละเอียด</th>
                  <th>ราคา</th>
                  <th>หมวดหมู่</th>
                  <th>สถานะ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td className="font-medium">
                      {product.name}
                    </td>

                    <td className="text-sm opacity-70">
                      {(product.description ?? "").substring(0, 50)}...
                    </td>

                    <td>
                      ฿{Number(product.price ?? 0).toLocaleString()}
                    </td>

                    <td>
                      <span className="badge badge-primary badge-outline">
                        {product.category}
                      </span>
                    </td>

                    <td>
                      {product.inStock ? (
                        <span className="badge badge-success">
                          มีสินค้า
                        </span>
                      ) : (
                        <span className="badge badge-error">
                          หมด
                        </span>
                      )}
                    </td>

                    <td className="text-center space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="btn btn-warning btn-sm"
                      >
                        แก้ไข
                      </button>

                      <button
                        onClick={() => handleDelete(product._id)}
                        className="btn btn-error btn-sm"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>

  </div>
</main>
  );
}





