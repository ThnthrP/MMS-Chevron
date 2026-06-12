import * as service from "../services/workerService.js";

export async function getWorkers(req, res) {
  try {
    const workers = await service.getWorkers();

    res.json(workers);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
}

export async function getWorkerById(req, res) {
  try {
    const worker = await service.getWorkerById(req.params.id);

    if (!worker) {
      return res.status(404).json({
        message: "Worker not found",
      });
    }

    res.json(worker);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
}

export async function createWorker(req, res) {
  try {
    const worker = await service.createWorker(req.body);

    res.status(201).json(worker);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create worker",
    });
  }
}

export async function updateWorker(req, res) {
  try {
    const worker = await service.updateWorker(req.params.id, req.body);

    res.json(worker);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update worker",
    });
  }
}

export async function deleteWorker(req, res) {
  try {
    await service.deleteWorker(req.params.id);

    res.json({
      message: "Worker deactivated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to deactivate worker",
    });
  }
}

export async function createPassport(req, res) {
  try {
    const passport = await service.createPassport(req.params.id, req.body);

    res.status(201).json(passport);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create passport",
    });
  }
}
