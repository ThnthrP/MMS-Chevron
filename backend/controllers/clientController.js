import * as service from "../services/clientService.js";

export async function getClients(req, res) {
  try {
    const clients = await service.getClients();
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
