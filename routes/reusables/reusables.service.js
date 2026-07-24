import { getChurch, getChurches } from "./services/churches.js";
import { createConference } from "./services/createConference.js";
import { getConferences } from "./services/getConferences.js";
import { updateConference } from "./services/updateConference.js";
import { createDepartment } from "./services/createDepartment.js";
import { getDepartments } from "./services/getDepartments.js";
import { getFrontendRoles } from "./services/frontendRoles.js";
import { createChurch } from "./services/createChurch.js";
import { switchActiveChurch } from "./services/switchChurch.js";

export const ReusableService = {
    createChurch,
    switchActiveChurch,
    getChurch,
    getChurches,
    getConferences,
    updateConference,
    createDepartment,
    getDepartments,
    getFrontendRoles,
}