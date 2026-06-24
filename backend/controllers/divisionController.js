import * as service from "../services/divisionService.js";

export async function listDivisions(req, res) {
  try {
    res.json(await service.listDivisions());
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
}

export async function createDivision(req, res) {
  try {
    const division = await service.createDivision(req.body.name);
    res.status(201).json(division);
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
}

export async function renameDivision(req, res) {
  try {
    const division = await service.renameDivision(req.params.id, req.body.name);
    res.json(division);
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
}

export async function deleteDivision(req, res) {
  try {
    res.json(await service.deleteDivision(req.params.id));
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
}
