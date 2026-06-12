const authorize = (resource, action) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const allowed = user.role.permissions.some(
      (rp) =>
        rp.permission.resource === resource && rp.permission.action === action,
    );

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
