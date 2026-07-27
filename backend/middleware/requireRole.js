// middleware/requireRole.js
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const roleName = req.user?.role?.name;

    if (!roleName || !allowedRoles.includes(roleName)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

export default requireRole;
