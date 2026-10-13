import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import experteamLogo from "../../assets/experteam_logo.png";

// ══════════════════════════════════════════════════════════
// ส่วนที่ใช้ร่วมกันระหว่าง Login.jsx และ ResetPassword.jsx
// ══════════════════════════════════════════════════════════

export const AUTH_INPUT =
  "box-border w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-[15px] outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export const AUTH_BTN =
  "w-full cursor-pointer rounded-md border-none bg-blue-600 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

export const AUTH_LINK =
  "cursor-pointer border-none bg-transparent p-0 text-sm text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline";

// ── กรอบการ์ดกลางจอ + โลโก้ ──
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center">
          <img src={experteamLogo} alt="Experteam" className="mb-2 w-14" />
          <div className="text-xl font-semibold text-gray-800">
            Manpower Management
          </div>
          <div className="text-sm text-gray-500">System</div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-gray-800">
          {title}
        </h1>
        {subtitle && (
          <p className="mb-6 text-center text-sm text-gray-500">{subtitle}</p>
        )}

        {children}

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  );
}

// ── ช่องรหัสผ่าน + ปุ่มตา ──
export function PasswordInput({ className = "", ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        className={`${AUTH_INPUT} pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        title={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
