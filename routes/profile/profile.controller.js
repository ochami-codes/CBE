import { ProfileService } from "./profile.service.js";
import { 
  getHandler,
} from "../../utils/controller.js";

export const ProfileController = {
  getProfile: getHandler(async (req) => ({
    profile:
      await ProfileService.getMyProfile({
        profileId: req.user.id,
      }),
  }))
};