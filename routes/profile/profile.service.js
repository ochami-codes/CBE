import { getMyProfile } from "./services/getMyProfile.js";
import { changePassword } from "./services/changePassword.js";
import { updateMyProfile } from "./services/updateProfile.js";

export const ProfileService = {
    getMyProfile,
    changePassword,
    updateMyProfile,
};