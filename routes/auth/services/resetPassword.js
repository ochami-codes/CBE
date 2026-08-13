import { ERROR_CODES } from "../../../errors/errorCodes.js";
import { supabaseAuth } from "../../../supabaseClient.js";
import { createAppError } from "../../../errors/AppError.js";

import { validateResetPasswordInput } from "../../../utils/validators/auth/resetPasswordValidator.js";

export async function resetPassword({ email }) {
  const { email: normalizedEmail } =
    validateResetPasswordInput({
      email,
    });

  try {
    const { error } =
      await supabaseAuth.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo:
            `${process.env.FRONTEND_URL}/auth/reset-password-confirm`,
        }
      );

    /*
     * Never reveal whether the email exists.
     */
    if (error) {
      console.error(
        "Reset password:",
        error
      );
    }

    return {
      message:
        "If the email exists, a reset link has been sent.",
    };
  } catch (error) {
    console.error(
      "Reset password:",
      error
    );

    throw createAppError(
      "Server error. Please try again later.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
}
