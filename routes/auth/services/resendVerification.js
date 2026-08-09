import { supabaseAuth } from "../../../supabaseClient.js";

import { validateResetPasswordInput } from "../../../utils/validators/auth/resetPasswordValidator.js";

export async function resendVerification({
  email,
}) {
  const { email: normalizedEmail } =
    validateResetPasswordInput({
      email,
    });

  try {
    const { error } =
      await supabaseAuth.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo:
            `${process.env.FRONTEND_URL}/auth/callback`,
        },
      });

   if (error) {
  console.error(
    "Resend verification failed:",
    {
      message: error.message,
      code: error.code,
    }
  );
}
    return {
      message:
        "If the email exists, a verification link has been sent.",
    };
  } catch (error) {
    console.error(
      "Resend verification:",
      error
    );

    // Still prevent enumeration
    return {
      message:
        "If the email exists, a verification link has been sent.",
    };
  }
}
