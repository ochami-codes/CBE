export function validateResetPasswordInput({
  email,
}) {
  const normalizedEmail = email
    ?.trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw new Error(
      "Invalid email address."
    );
  }

  return {
    email: normalizedEmail,
  };
}