import * as service from "../services/matchExceptionService.js";

// error ที่ service ตั้ง status ไว้ (400/403/404/409) ส่งข้อความกลับตรงๆ
const fail = (res, error) => {
  if (!error.status) console.error(error);
  res.status(error.status || 500).json({ message: error.message });
};

// POST /api/match-exceptions  { requestId, employeeIds[], reason }
export async function create(req, res) {
  try {
    const { requestId, employeeIds, reason } = req.body;
    const result = await service.createRequests({
      requestId,
      employeeIds,
      reason,
      userId: req.user.id,
    });
    res.status(201).json(result);
  } catch (error) {
    fail(res, error);
  }
}

// GET /api/match-exceptions?status=pending|approved|rejected|all
export async function list(req, res) {
  try {
    res.json(await service.listRequests({ status: req.query.status }));
  } catch (error) {
    fail(res, error);
  }
}

// GET /api/match-exceptions/pending-count
export async function pendingCount(req, res) {
  try {
    res.json({ count: await service.countPending() });
  } catch (error) {
    fail(res, error);
  }
}

// GET /api/match-exceptions/request/:requestId
export async function forRequest(req, res) {
  try {
    res.json(await service.listForManpowerRequest(req.params.requestId));
  } catch (error) {
    fail(res, error);
  }
}

// PUT /api/match-exceptions/:id/decision  { decision: "approved"|"rejected", note }
export async function decide(req, res) {
  try {
    const { decision, note } = req.body;
    const result = await service.decide(req.params.id, {
      decision,
      note,
      userId: req.user.id,
    });
    res.json(result);
  } catch (error) {
    fail(res, error);
  }
}
