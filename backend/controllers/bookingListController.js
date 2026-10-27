import * as service from "../services/bookingListService.js";

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn());
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ message: error.message });
  }
};

// GET /api/training-requests/items
export const getTrainingItems = handle(service.getTrainingItems);
// GET /api/medical-requests/items
export const getMedicalItems = handle(service.getMedicalItems);
// GET /api/medical-requests/pending-keys
export const getPendingMedicalKeys = handle(service.getPendingMedicalKeys);
