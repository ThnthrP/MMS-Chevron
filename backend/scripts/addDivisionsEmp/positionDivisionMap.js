// ════════════════════════════════════════════════════════════════
// Position → Division mapping (Chevron)
//   - key  = ค่าใน Employee.position.name (ต้องตรงเป๊ะ ตัวพิมพ์/เว้นวรรค)
//   - value = Employee.division
// อ้างอิงจาก reference ของ client อื่น (Chevron record ไม่มี division มาให้)
// crane ทั้งหมด → Operation ตามที่ตกลง
// ════════════════════════════════════════════════════════════════
export const POSITION_DIVISION = {
  "Assistance Floor Operator": "Operation",
  "Construction E&I Technician": "IE",
  "Construction Supervisor (Mech)": "Engineering",
  "Crane Operator": "Operation",
  "Crane Operator - Class A": "Operation",
  "Crane Operator - Class A (Certify by Company)": "Operation",
  "Crane Operator CPP": "Operation",
  "Crane Operator / Scaffoldder": "Operation", // ⚠ สะกด Scaffoldder (สอง d) ตามข้อมูลจริง
  "E&I Foreman": "IE",
  "E&I Technician": "IE",
  "Fire Watcher": "SSHE",
  Fitter: "Operation",
  Foreman: "Operation",
  Inspector: "QC",
  "Pipe Fitter B": "Operation",
  "QC Tech Level I": "QC",
  "Rigger / Scaffolder": "Scaffold&Paint",
  "Rigger / Scaffolder (Skill Mechanic)": "Scaffold&Paint",
  "Safety Officer": "SSHE",
  "Safety Officer / Fire Watcher": "SSHE",
  Scaffolder: "Scaffold&Paint",
  "Scaffolding Subject Matter Expertise (SME)": "Scaffold&Paint",
  Supervisor: "Operation",
  Welder: "Operation",
  "Welder, Regular": "Operation",
};
