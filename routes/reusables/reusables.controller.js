import { ReusableService } from "./reusables.service.js";
import {
  createHandler,
  getHandler,
  updateHandler,
} from "../../utils/controller.js";
import { getFrontendRoles } from "./services/frontendRoles.js";

export const ReusableController = {
  createChurch: createHandler(async (req) =>
    ChurchService.createChurch({
      profileId: req.user.id,
      churchName: req.body.church_name,
      conferenceId: req.body.conference_id,
    })
  ),

  switchActiveChurch: updateHandler(async (req) =>
    ReusableService.switchActiveChurch({
      profileId: req.user.id,
      churchId: req.body.church_id,
    })
  ),

  getChurch: getHandler(async (req) =>
    ReusableService.getChurch({
      churchId: req.params.churchId,
    })
  ),

  getChurches: getHandler(async (req) =>
    ReusableService.getChurches({
      search: req.query.search,
    })
  ),

  getConferences: getHandler(async () =>
    ReusableService.getConferences()
  ),

  updateConference: updateHandler(async (req) =>
    ReusableService.updateConference({
      conferenceId: req.params.conferenceId,
      ...req.body,
    })
  ),

  createDepartment: createHandler(async (req) =>
    ReusableService.createDepartment({
      churchId: req.user.active_church_id,
      ...req.body,
    })
  ),

  getDepartments: getHandler(async (req) =>
    ReusableService.getDepartments({
      churchId: req.user.active_church_id,
    })
  ),

  getFrontendRoles: getHandler(async () =>
    ReusableService.getFrontendRoles()
  ),
};
