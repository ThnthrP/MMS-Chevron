-- ตัดช่องว่างเกินจากชื่อที่แยกไว้ใน migration ก่อนหน้า
-- และจัด name ให้เว้นวรรคช่องเดียว (บางคนในข้อมูลเดิมเว้น 2 ช่อง)
UPDATE "User"
SET "firstName" = btrim("firstName"),
    "lastName"  = NULLIF(btrim("lastName"), ''),
    name        = concat_ws(' ', btrim("firstName"), NULLIF(btrim("lastName"), ''));