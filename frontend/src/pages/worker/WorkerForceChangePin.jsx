import { useContext } from "react";
import { WorkerAppContent } from "../../context/WorkerAppContext";
import experteamLogo from "../../assets/experteam_logo.png";
import ChangePinForm from "./ChangePinForm";

// หน้าเต็มจอ บังคับตั้ง PIN ใหม่หลัง login ด้วย PIN ที่ HR ตั้งให้
// แสดงแทนแอปทั้งหมดจนกว่าจะตั้งเสร็จ (คุมโดย MustChangePinGate ใน WorkerAppRouter)
export default function WorkerForceChangePin() {
  const { employee, setMustChangePin, logout } = useContext(WorkerAppContent);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex flex-col items-center">
          <img src={experteamLogo} alt="Experteam" className="mb-2 w-14" />
          <div className="text-xl font-bold text-gray-800">ตั้ง PIN ใหม่</div>
          <div className="mt-1 text-sm text-gray-500">
            {employee?.fullName}
            {employee?.empId ? ` · ${employee.empId}` : ""}
          </div>
        </div>

        <ChangePinForm mode="forced" onDone={() => setMustChangePin(false)} />

        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full cursor-pointer border-none bg-transparent text-xs text-gray-400 underline hover:text-gray-600"
        >
          ไม่ใช่คุณ? ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
