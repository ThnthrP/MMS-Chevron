// middleware/requireRoleOrPermission.js
//
// ผ่านถ้า role อยู่ใน allowedRoles (เหมือน requireRole เดิมทุกอย่าง)
// OR มี permission ตรงกับ permString (ช่องทางเพิ่มสำหรับ role อื่นที่ไม่ต้องเปลี่ยน role หลัก)
//
// ใช้แทน requireRole เฉพาะจุดที่อยากเปิดสิทธิ์ให้ role อื่นทำงานเจาะจงได้
// โดยไม่ต้องเพิ่ม role นั้นเข้า allowedRoles ตรงๆ (กระทบ endpoint อื่นที่ใช้ requireRole เดิม)
const requireRoleOrPermission = (permString, ...allowedRoles) => {
  return (req, res, next) => {
    const roleName = req.user?.role?.name;

    if (roleName && allowedRoles.includes(roleName)) return next();
    if (req.permissions?.includes(permString)) return next();

    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action",
    });
  };
};

export default requireRoleOrPermission;
