import { getHandler, updateHandler } from "../../utils/controller.js";
import { createSupabaseUserClient } from "../../supabaseClient.js";
import { ProfileService } from "./profile.service.js";

export const ProfileController = {
  /* =========================================================
     GET MY PROFILE
     ========================================================= */

  getProfile: getHandler(async (req) => ({
    profile: await ProfileService.getMyProfile({
      profileId: req.user.id,
    }),
  })),

  /* =========================================================
     UPDATE PROFILE
     Full name + phone
     ========================================================= */

  updateProfile: updateHandler(async (req) =>
    ProfileService.updateMyProfile({
      profileId: req.user.id,
      fullName: req.body.fullName,
      phone: req.body.phone,
    })
  ),

  /* =========================================================
     CHANGE PASSWORD
     ========================================================= */

  changePassword: updateHandler(async (req) =>
    ProfileService.changePassword({
      authUserId: req.user.auth_user_id,
      newPassword: req.body.password?.newPassword,
    })
  ),
};