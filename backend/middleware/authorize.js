import { permissionsOf } from "../utils/roles.js";

// เช็ก permission จากทุก role ของ user (หลัก + เสริม)
const authorize = (resource, action) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    // req.permissions มาจาก userAuth (รวมทุก role แล้ว) — ถ้าไม่มีให้คำนวณจาก user
    const perms = req.permissions ?? permissionsOf(user);
    const allowed = perms.includes(`${resource}:${action}`);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission",
      });
    }

    next();
  };
};

export default authorize;
