import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AppContent } from "../../context/AppContext";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

import Layout from "../../components/layout/Layout";

// ── role badge tones — เดียวกับ AdminUsers.jsx (จับคู่แบบ prefix: hr_officer → hr) ──
const ROLE_TONE = {
  safety_manager: "bg-[#fce4ec] text-[#ad1457]",
  admin: "bg-[#ede7f6] text-[#5e35b1]",
  manpower: "bg-[#e3f2fd] text-[#1565c0]",
  hr: "bg-[#e0f2f1] text-[#00695c]",
  pe: "bg-[#fff3e0] text-[#e65100]",
  safety: "bg-[#fce4ec] text-[#ad1457]",
  expert: "bg-[#f1f8e9] text-[#558b2f]",
  nurse: "bg-[#e8eaf6] text-[#3949ab]",
};
const roleTone = (name) => {
  const n = (name || "").toLowerCase();
  const key = Object.keys(ROLE_TONE)
    .sort((a, b) => b.length - a.length) // ชื่อยาวก่อน (safety_manager ก่อน safety)
    .find((k) => n === k || n.startsWith(`${k}_`));
  return key ? ROLE_TONE[key] : "bg-gray-100 text-gray-500";
};

const TITLE_PREFIX_OPTIONS = ["นาย", "นาง", "นางสาว", "Mr.", "Mrs.", "Ms."];

const EMPTY_PW = { currentPassword: "", newPassword: "", confirmPassword: "" };

const formFromUser = (u) => ({
  titlePrefix: u?.titlePrefix || "",
  name: u?.name || "",
  email: u?.email || "",
  phone: u?.phone || "",
  department: u?.department || "",
});

const initials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

// ══════════════════════════════════════════════════════════
// Tailwind class ที่ใช้ซ้ำ
// ══════════════════════════════════════════════════════════
const CARD = "overflow-hidden rounded-[10px] border border-gray-200 bg-white";
const CARD_HEAD =
  "flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5 text-[13px] font-bold text-gray-900 sm:px-5";
const LABEL = "text-[11px] font-bold uppercase tracking-[0.4px] text-gray-500";
const INPUT =
  "box-border w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 py-[7px] text-[13px] outline-none focus:border-blue-400";
const LINK_BTN =
  "cursor-pointer whitespace-nowrap border-none bg-transparent p-0 text-xs font-semibold text-blue-600 hover:underline";
const SAVE_BTN =
  "cursor-pointer whitespace-nowrap rounded-md border-none bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-default disabled:opacity-70";
const CANCEL_BTN =
  "cursor-pointer whitespace-nowrap rounded-md border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50";

// ══════════════════════════════════════════════════════════
// แถวข้อมูล: label + ค่า/ช่องกรอก + ปุ่ม
// (อยู่นอก Profile — เดิมประกาศไว้ข้างใน ทำให้ถูกสร้างใหม่ทุกครั้งที่พิมพ์)
// ══════════════════════════════════════════════════════════
function InlineField({
  label,
  fieldKey,
  value,
  editing,
  editable = true,
  placeholder,
  options, // มี = select
  emptyOptionText = "— เลือก —",
  hint,
  saving,
  onStart,
  onChange,
  onSave,
  onCancel,
}) {
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="border-b border-gray-100 px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[140px_1fr_auto]">
        <span className={LABEL}>{label}</span>

        {/* ค่า / ช่องกรอก — มือถือขึ้นบรรทัดใหม่เต็มความกว้าง */}
        <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {editing ? (
            options ? (
              <select
                name={fieldKey}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                className={INPUT}
                autoFocus
              >
                <option value="">{emptyOptionText}</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={fieldKey}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className={INPUT}
                autoFocus
              />
            )
          ) : (
            <span
              className={`block break-words text-sm font-medium ${
                value ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {value || placeholder || "—"}
            </span>
          )}
        </div>

        <div className="col-start-2 row-start-1 flex justify-end sm:col-start-3">
          {editing ? (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className={SAVE_BTN}
              >
                {saving ? "..." : "บันทึก"}
              </button>
              <button type="button" onClick={onCancel} className={CANCEL_BTN}>
                ยกเลิก
              </button>
            </div>
          ) : editable ? (
            <button type="button" onClick={onStart} className={LINK_BTN}>
              {value ? "แก้ไข" : "เพิ่ม"}
            </button>
          ) : (
            <span className="whitespace-nowrap text-[11px] text-gray-400">
              {hint}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ช่องรหัสผ่าน + ปุ่มตา ──
function PasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete,
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <span className={`${LABEL} mb-1 block`}>{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className={`${INPUT} pr-9`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          title={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          className="absolute right-2 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-gray-500 hover:text-gray-700"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════
const Profile = () => {
  const { backendUrl, userData, getUserData } = useContext(AppContent);

  const [form, setForm] = useState(formFromUser(null));
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Change Password — แยก state/endpoint ออกจาก form หลักเสมอ ──
  // ต้องส่ง currentPassword ให้ backend ตรวจก่อนเปลี่ยน
  // ห้ามรวมเข้ากับ /api/user/update เพราะ endpoint นั้นไม่ตรวจรหัสผ่านเดิม
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  useEffect(() => {
    if (userData) setForm(formFromUser(userData));
  }, [userData]);

  // ── รายชื่อแผนกจริงจากระบบ ──
  useEffect(() => {
    axios
      .get(`${backendUrl}/api/divisions`, { withCredentials: true })
      .then((res) => setDivisionOptions(res.data.map((d) => d.name)))
      .catch((err) => console.error(err));
  }, [backendUrl]);

  // แผนกเดิมของผู้ใช้ที่ถูกลบออกจากระบบไปแล้ว — ยังต้องเลือกค้างไว้ได้
  const departmentOptions =
    form.department && !divisionOptions.includes(form.department)
      ? [form.department, ...divisionOptions]
      : divisionOptions;

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // เริ่มแก้ช่องใหม่ = ทิ้งค่าที่ยังไม่บันทึกของช่องก่อนหน้า
  // (เดิมค่าค้างอยู่ใน form แล้วถูกบันทึกไปพร้อมช่องถัดไปโดยไม่ตั้งใจ)
  const startEdit = (key) => {
    setForm(formFromUser(userData));
    setEditingField(key);
  };

  const handleCancel = () => {
    setForm(formFromUser(userData));
    setEditingField(null);
  };

  const handleSave = async () => {
    if (loading) return;
    if (!form.name.trim()) {
      toast.error("กรุณากรอกชื่อ");
      return;
    }
    // ไม่ได้เปลี่ยนอะไร — ปิดช่องเฉยๆ ไม่ต้องยิง API
    const original = formFromUser(userData);
    if (editingField && form[editingField] === original[editingField]) {
      setEditingField(null);
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.put(
        `${backendUrl}/api/user/update`,
        {
          titlePrefix: form.titlePrefix || null,
          name: form.name.trim(),
          phone: form.phone.trim(),
          department: form.department,
        },
        { withCredentials: true },
      );
      if (data.success) {
        toast.success("อัปเดตโปรไฟล์แล้ว");
        await getUserData();
        setEditingField(null);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePwChange = (e) =>
    setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePwCancel = () => {
    setPwForm(EMPTY_PW);
    setShowPwForm(false);
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    if (pwLoading) return;
    const { currentPassword, newPassword, confirmPassword } = pwForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("กรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน");
      return;
    }
    try {
      setPwLoading(true);
      const { data } = await axios.put(
        `${backendUrl}/api/user/change-password`,
        { currentPassword, newPassword },
        { withCredentials: true },
      );
      if (data.success) {
        toast.success("เปลี่ยนรหัสผ่านแล้ว");
        handlePwCancel();
      } else {
        toast.error(data.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "เปลี่ยนรหัสผ่านไม่สำเร็จ — ตรวจสอบรหัสผ่านเดิม",
      );
    } finally {
      setPwLoading(false);
    }
  };

  // props ที่ทุกแถวใช้เหมือนกัน
  const fieldProps = (key) => ({
    fieldKey: key,
    value: form[key],
    editing: editingField === key,
    saving: loading,
    onStart: () => startEdit(key),
    onChange: handleChange,
    onSave: handleSave,
    onCancel: handleCancel,
  });

  const confirmMismatch =
    pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword;
  const tooShort = pwForm.newPassword && pwForm.newPassword.length < 8;

  return (
    <Layout>
      <div className="mx-auto w-full min-w-0 max-w-[980px]">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_1fr]">
          {/* ── ซ้าย: avatar + role (sticky บนจอใหญ่) ── */}
          <div className={`${CARD} px-5 py-7 text-center lg:sticky lg:top-6`}>
            <div
              className={`mx-auto mb-3.5 flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl font-bold ${roleTone(
                userData?.role?.name,
              )}`}
            >
              {initials(userData?.name)}
            </div>
            <div className="break-words text-base font-bold text-gray-900">
              {userData?.titlePrefix
                ? `${userData.titlePrefix}${userData.name || ""}`
                : userData?.name || "—"}
            </div>
            <div className="mb-2.5 break-words text-xs text-gray-500">
              {userData?.email}
            </div>
            <span
              className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold capitalize ${roleTone(
                userData?.role?.name,
              )}`}
            >
              {userData?.role?.name || "No role"}
            </span>
          </div>

          {/* ── ขวา: รายละเอียด + รหัสผ่าน ── */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className={CARD}>
              <div className={CARD_HEAD}>ข้อมูลส่วนตัว</div>
              <InlineField
                label="คำนำหน้า"
                {...fieldProps("titlePrefix")}
                placeholder="ยังไม่ได้เลือก"
                options={TITLE_PREFIX_OPTIONS}
                emptyOptionText="— เลือกคำนำหน้า —"
              />
              <InlineField label="ชื่อ" {...fieldProps("name")} />
              <InlineField
                label="Email"
                {...fieldProps("email")}
                editable={false}
                hint="ไม่สามารถแก้ไขได้"
              />
              <InlineField
                label="เบอร์โทร"
                {...fieldProps("phone")}
                placeholder="+66 xx xxx xxxx"
              />
              <InlineField
                label="แผนก"
                {...fieldProps("department")}
                placeholder="ยังไม่ได้เลือก"
                options={departmentOptions}
                emptyOptionText="— เลือกแผนก —"
              />
            </div>

            {/* ── รหัสผ่าน ── */}
            <div className={CARD}>
              <div className={`${CARD_HEAD} ${showPwForm ? "" : "border-b-0"}`}>
                <span>รหัสผ่าน</span>
                {!showPwForm && (
                  <button
                    type="button"
                    onClick={() => setShowPwForm(true)}
                    className={LINK_BTN}
                  >
                    เปลี่ยนรหัสผ่าน
                  </button>
                )}
              </div>

              {showPwForm && (
                <form
                  onSubmit={handlePwSubmit}
                  onKeyDown={(e) => e.key === "Escape" && handlePwCancel()}
                  className="px-4 py-4 sm:px-5"
                >
                  <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <PasswordField
                      label="รหัสผ่านปัจจุบัน"
                      name="currentPassword"
                      value={pwForm.currentPassword}
                      onChange={handlePwChange}
                      autoComplete="current-password"
                      autoFocus
                    />
                    <PasswordField
                      label="รหัสผ่านใหม่"
                      name="newPassword"
                      value={pwForm.newPassword}
                      onChange={handlePwChange}
                      placeholder="อย่างน้อย 8 ตัว"
                      autoComplete="new-password"
                    />
                    <PasswordField
                      label="ยืนยันรหัสผ่านใหม่"
                      name="confirmPassword"
                      value={pwForm.confirmPassword}
                      onChange={handlePwChange}
                      autoComplete="new-password"
                    />
                  </div>

                  {(tooShort || confirmMismatch) && (
                    <div className="mb-3 text-[11px] font-semibold text-red-600">
                      {tooShort
                        ? "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"
                        : "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน"}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className={SAVE_BTN}
                    >
                      {pwLoading ? "กำลังเปลี่ยน..." : "ยืนยันเปลี่ยนรหัสผ่าน"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePwCancel}
                      className={CANCEL_BTN}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
