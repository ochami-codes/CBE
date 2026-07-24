export function validateChangePasswordInput(input = {}) {
  let { newPassword } = input;

  // Support accidental nested payloads
  if (
    typeof newPassword === "object" &&
    newPassword !== null
  ) {
    newPassword =
      newPassword.password ??
      newPassword.newPassword ??
      "";
  }

  newPassword = String(newPassword ?? "").trim();

  if (!newPassword) {
    throw new Error(
      "New password is required."
    );
  }

  if (newPassword.length < 6) {
    throw new Error(
      "New password must be at least 6 characters long."
    );
  }

  return {
    newPassword,
  };
}