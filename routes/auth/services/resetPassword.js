import { supabaseAdmin } from "../../../supabaseClient.js";

import { validateResetPasswordInput } from "../../../validators/auth/resetPasswordValidator.js";

export async function resetPassword({
  email,
}) {
  const { email: normalizedEmail } =
    validateResetPasswordInput({
      email,
    });

  try {
    const { error } =
      await supabaseAdmin.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo:
            `${process.env.FRONTEND_URL}/auth/reset-password-confirm`,
        }
      );

    // Prevent email enumeration
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

    throw new Error(
      "Server error. Please try again later."
    );
  }
}
