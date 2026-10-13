import * as service from "../services/employeeBanService.js";

export async function banEmployee(req, res) {
  try {
    const { id } = req.params; // employeeId
    const { durationMonths, customUntil, reason, reasonNote, sourceTaskId } =
      req.body;
    if (!durationMonths && !customUntil) {
      return res
        .status(400)
        .json({ message: "ต้องระบุ durationMonths หรือ customUntil" });
    }
    const ban = await service.banEmployee({
      employeeId: id,
      durationMonths,
      customUntil,
      reason,
      reasonNote,
      bannedById: req.userId,
      sourceTaskId,
    });
    res.status(201).json(ban);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function liftBan(req, res) {
  try {
    const { banId } = req.params;
    const { liftReason } = req.body;
    const ban = await service.liftBan(banId, {
      liftedById: req.userId,
      liftReason,
    });
    res.json(ban);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export async function getBanHistory(req, res) {
  try {
    const { id } = req.params;
    const history = await service.getBanHistory(id);
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
