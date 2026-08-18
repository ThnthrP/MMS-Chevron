-- ยืนยันว่าไม่มีค่า 'medium' หลงเหลือ (ควรว่างเปล่า / 0 rows)
SELECT id, "empCode", "healthRisk" FROM "Employee" WHERE "healthRisk"::text = 'medium';

-- ยืนยันว่า table MedicalExamRecord ถูกสร้างครบ
\d "MedicalExamRecord"
