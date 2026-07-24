import { PastorService } from "./pastor.service.js";

export async function getDashboard(req, res, next) {
  try {
    const churchId = req.user.active_church_id;

    const dashboard =
      await PastorService.getDashboard({
        churchId,
      });

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
}
