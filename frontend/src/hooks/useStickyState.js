import { useState, useEffect } from "react";

// useState ที่จำค่าไว้ใน sessionStorage
//   - คงค้างเมื่อสลับหน้า (route) ในแท็บเดียว
//   - หายเมื่อปิดแท็บ (ไม่ค้างข้ามวันแบบ localStorage)
// ใช้แทน useState ได้เลย: const [x, setX] = useStickyState("key", default)
export default function useStickyState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // sessionStorage เต็ม/ปิด → ข้าม
    }
  }, [key, value]);

  return [value, setValue];
}
