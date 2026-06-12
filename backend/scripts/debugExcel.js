import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE_PATH = path.join(
  __dirname,
  "../../training_record_from_hr/Employee Training Offshore-Erawan 31-3-2026.xlsx"
);

const workbook = xlsx.readFile(FILE_PATH);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// แปลงเป็น JSON
const rows = xlsx.utils.sheet_to_json(sheet);

// ✅ เอาแค่ header
const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

console.log("🧾 Headers:");
console.log(headers);