// ============================================================
// roles.js — 1 user มีได้หลาย role (role หลัก + role เสริม)
// userData.roleNames มาจาก /api/user/data — role หลักอยู่ตัวแรก
// เช็กสิทธิ์ด้วย helper ในไฟล์นี้เสมอ อย่าเช็ก userData.role.name ตรงๆ
// ============================================================

export const roleNamesOf = (user) => {
  if (Array.isArray(user?.roleNames)) return user.roleNames;
  const names = [];
  if (user?.role?.name) names.push(user.role.name);
  for (const r of user?.extraRoles || []) {
    if (r?.name && !names.includes(r.name)) names.push(r.name);
  }
  return names;
};

export const hasRole = (user, roleName) => roleNamesOf(user).includes(roleName);

export const hasAnyRole = (user, roleList = []) =>
  roleNamesOf(user).some((r) => roleList.includes(r));

// ข้อความแสดง role เช่น "manpower_supply + project_engineer"
export const roleLabel = (user) => roleNamesOf(user).join(" + ");
