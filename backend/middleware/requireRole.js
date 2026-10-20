// middleware/requireRole.js
// ผ่านถ้า role ใด role หนึ่งของ user (หลัก หรือ เสริม) อยู่ใน allowedRoles
import { hasAnyRole } from "../utils/roles.js";

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!hasAnyRole(req.user, allowedRoles)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

export default requireRole;
