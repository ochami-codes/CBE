
import { supabaseAdmin } from "../../../supabaseClient.js";

import { validateChangePasswordInput } from "../../../validators/auth/changePasswordValidator.js";

export async function changePassword({
  authUserId,
  newPassword,
}) {
  if (!authUserId) {
    throw new Error(
      "Authenticated user not found."
    );
  }

  const { newPassword: password } =
    validateChangePasswordInput({
      newPassword,
    });

  const { error } =
    await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      {
        password,
      }
    );

  if (error) {
    throw new Error(
      error.message ||
        "Failed to update password."
    );
  }

  return {
    message:
      "Password updated successfully. Please sign in again.",
    logout: true,
  };
}