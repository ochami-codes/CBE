
import { supabaseAdmin } from "../../../supabaseClient.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { createAppError } from "../../../errors/AppError.js";
import { validateChangePasswordInput } from "../../../utils/validators/auth/changePasswordValidator.js";

export async function changePassword({
  authUserId,
  newPassword,
}) {
  if (!authUserId) {
    throw  createAppError(
      "Authenticated user not found.",
      404,
      ERROR_CODES.NOT_FOUND
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
    throw createAppError(
       "Failed to update password.",
       500,
       ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  return {
    message:
      "Password updated successfully. Please sign in again.",
    logout: true,
  };
}