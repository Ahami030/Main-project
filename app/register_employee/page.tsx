"use client";
import Link from "next/link";
import { useState } from "react";

type EmployeeForm = {
  // ข้อมูลส่วนตัว
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // ข้อมูลพนักงาน
  employeeId: string;
  department: string;
  position: string;
  startDate: string;
  employmentType: string;
};

const DEPARTMENTS = [
  "Engineering",
  "Marketing",
  "Sales",
  "Human Resources",
  "Finance & Accounting",
  "Operations",
  "Design",
  "Customer Support",
];

const POSITIONS = [
  "Junior",
  "Mid-level",
  "Senior",
  "Lead",
  "Manager",
  "Director",
  "VP",
  "C-Level",
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];

// --- Reusable sub-components ---

function SectionHeader({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="badge badge-primary badge-lg font-bold text-xs px-3">
        {step}
      </div>
      <div>
        <p className="font-semibold text-base-content text-sm leading-tight">
          {title}
        </p>
        <p className="text-base-content/40 text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

function InputWithIcon({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="input input-bordered flex items-center gap-2 focus-within:input-primary transition-all w-full">
      <span className="text-base-content/40 shrink-0">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="grow bg-transparent outline-none text-sm"
      />
    </label>
  );
}

// --- Icons ---
const IconUser = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);
const IconEmail = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);
const IconPhone = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
  </svg>
);
const IconLock = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);
const IconBadge = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);
const IconCalendar = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

// --- Main Page ---
function EmployeeRegisterPage() {
  const [form, setForm] = useState<EmployeeForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    employeeId: "",
    department: "",
    position: "",
    startDate: "",
    employmentType: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const set = (field: keyof EmployeeForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setErrorMessage("รหัสผ่านไม่ตรงกัน");
      return;
    }
    const required: (keyof EmployeeForm)[] = [
      "firstName","lastName","email","password",
      "employeeId","department","position","employmentType",
    ];
    if (required.some((f) => !form[f])) {
      setErrorMessage("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const resCheck = await fetch("http://localhost:3000/api/checkUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const { user } = await resCheck.json();
      if (user) {
        setErrorMessage("อีเมลนี้ถูกใช้งานแล้ว");
        return;
      }

      const res = await fetch("http://localhost:3000/api/register/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccessMessage("ลงทะเบียนพนักงานสำเร็จ! 🎉");
        setForm({
          firstName: "", lastName: "", email: "", phone: "",
          password: "", confirmPassword: "", employeeId: "",
          department: "", position: "", startDate: "", employmentType: "",
        });
      } else {
        setErrorMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Card */}
        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-8">

            {/* Header */}
            <div className="text-center mb-8">
              <div className="avatar placeholder mb-3">
                <div className="bg-secondary text-secondary-content rounded-full w-14">
                  <span className="text-2xl">🏢</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-base-content tracking-tight">
                ลงทะเบียนพนักงาน
              </h1>
              <p className="text-base-content/50 text-sm mt-1">
                Employee Registration — กรอกข้อมูลให้ครบถ้วน
              </p>
            </div>

            {/* Alerts */}
            {errorMessage && (
              <div role="alert" className="alert alert-error mb-6 py-3">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div role="alert" className="alert alert-success mb-6 py-3">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ─── Section 1: ข้อมูลส่วนตัว ─── */}
              <div>
                <SectionHeader
                  step="01"
                  title="ข้อมูลส่วนตัว"
                  subtitle="Personal Information"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">ชื่อ <span className="text-error">*</span></span>
                    </label>
                    <InputWithIcon icon={<IconUser />} placeholder="ชื่อจริง" value={form.firstName} onChange={set("firstName")} />
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">นามสกุล <span className="text-error">*</span></span>
                    </label>
                    <InputWithIcon icon={<IconUser />} placeholder="นามสกุล" value={form.lastName} onChange={set("lastName")} />
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">อีเมล <span className="text-error">*</span></span>
                    </label>
                    <InputWithIcon icon={<IconEmail />} type="email" placeholder="employee@company.com" value={form.email} onChange={set("email")} />
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">เบอร์โทรศัพท์</span>
                    </label>
                    <InputWithIcon icon={<IconPhone />} type="tel" placeholder="0XX-XXX-XXXX" value={form.phone} onChange={set("phone")} />
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">รหัสผ่าน <span className="text-error">*</span></span>
                    </label>
                    <InputWithIcon icon={<IconLock />} type="password" placeholder="อย่างน้อย 8 ตัวอักษร" value={form.password} onChange={set("password")} />
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">ยืนยันรหัสผ่าน <span className="text-error">*</span></span>
                    </label>
                    <InputWithIcon icon={<IconLock />} type="password" placeholder="กรอกรหัสผ่านอีกครั้ง" value={form.confirmPassword} onChange={set("confirmPassword")} />
                  </div>

                </div>
              </div>

              <div className="divider my-0" />

              {/* ─── Section 2: ข้อมูลพนักงาน ─── */}
              <div>
                <SectionHeader
                  step="02"
                  title="ข้อมูลพนักงาน"
                  subtitle="Employment Details"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">รหัสพนักงาน <span className="text-error">*</span></span>
                    </label>
                    <InputWithIcon icon={<IconBadge />} placeholder="EMP-XXXX" value={form.employeeId} onChange={set("employeeId")} />
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">วันที่เริ่มงาน</span>
                    </label>
                    <InputWithIcon icon={<IconCalendar />} type="date" placeholder="dd/mm/yyyy" value={form.startDate} onChange={set("startDate")} />
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">แผนก <span className="text-error">*</span></span>
                    </label>
                    <select
                      className="select select-bordered focus:select-primary transition-all w-full text-sm"
                      value={form.department}
                      onChange={set("department")}
                    >
                      <option value="" disabled>เลือกแผนก</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">ระดับตำแหน่ง <span className="text-error">*</span></span>
                    </label>
                    <select
                      className="select select-bordered focus:select-primary transition-all w-full text-sm"
                      value={form.position}
                      onChange={set("position")}
                    >
                      <option value="" disabled>เลือกระดับ</option>
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control sm:col-span-2">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">ประเภทการจ้างงาน <span className="text-error">*</span></span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {EMPLOYMENT_TYPES.map((type) => (
                        <label key={type} className="cursor-pointer">
                          <input
                            type="radio"
                            name="employmentType"
                            value={type}
                            checked={form.employmentType === type}
                            onChange={set("employmentType")}
                            className="hidden"
                          />
                          <span
                            className={`badge badge-lg px-4 py-3 border transition-all text-sm font-medium cursor-pointer select-none
                              ${form.employmentType === type
                                ? "badge-primary border-primary"
                                : "badge-ghost border-base-300 hover:border-primary hover:text-primary"
                              }`}
                          >
                            {type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* ─── Submit ─── */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-secondary w-full"
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    "ลงทะเบียนพนักงาน"
                  )}
                </button>
              </div>

            </form>

            {/* Footer links */}
            <div className="divider text-base-content/30 text-xs my-4">หรือ</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/register" className="btn btn-outline btn-neutral flex-1 btn-sm">
                สมัครสมาชิกทั่วไป
              </Link>
              <Link href="/login" className="btn btn-outline btn-neutral flex-1 btn-sm">
                เข้าสู่ระบบ
              </Link>
            </div>

          </div>
        </div>

        <p className="text-center text-xs text-base-content/30 mt-5">
          สำหรับพนักงานภายในองค์กรเท่านั้น · Internal use only
        </p>
      </div>
    </div>
  );
}

export default EmployeeRegisterPage;