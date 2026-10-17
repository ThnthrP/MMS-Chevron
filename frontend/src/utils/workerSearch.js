// ============================================================
// utils/workerSearch.js
// ตัวช่วยกลางสำหรับช่องค้นหา worker (react-select) — ใช้ร่วมกันทุกหน้า
// ค้นได้ทั้ง Employee ID, EMP CODE, ชื่อภาษาไทย, ชื่อภาษาอังกฤษ
// ============================================================

// ชื่ออังกฤษ: ใช้ fullNameEN ถ้ามี ไม่งั้นใช้ fullName (ข้อมูลเดิมเก็บชื่ออังกฤษไว้ที่ fullName)
export const nameEN = (w) => w?.fullNameEN || w?.fullName || "";

// ชื่อไทย: แสดงเฉพาะเมื่อไม่ซ้ำกับชื่ออังกฤษ
export const nameTH = (w) => {
  const th = (w?.fullNameTH || "").trim();
  return th && th !== nameEN(w) ? th : "";
};

// ตัดช่องว่างทั้งหมด + ตัวพิมพ์เล็ก → "1767 3672" ค้นด้วย "17673672" ก็เจอ
const squash = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");

// label ใน dropdown: "38561733 : ชื่อไทย : English Name"
export const workerLabel = (w) =>
  [w.empId, nameTH(w), nameEN(w)].filter(Boolean).join(" : ");

// option สำหรับ react-select — เก็บข้อความค้นหาไว้ที่ data.search
export const toWorkerOption = (w) => ({
  value: w.id,
  label: workerLabel(w),
  search: squash([w.empId, w.empCode, w.fullNameTH, w.fullNameEN, w.fullName].join(" ")),
});

// เรียงตามชื่ออังกฤษ แล้วแปลงเป็น options (ไม่รวม "All Workers")
export const buildWorkerOptions = (workers) =>
  workers
    .slice()
    .sort((a, b) => nameEN(a).localeCompare(nameEN(b)))
    .map(toWorkerOption);

// filterOption ของ react-select — ใช้แทนตัว default (ซึ่งค้นใน value=uuid ด้วย)
export const filterWorkerOption = (option, input) => {
  if (!input) return true;
  const hay = option.data?.search ?? squash(option.label);
  return hay.includes(squash(input));
};
