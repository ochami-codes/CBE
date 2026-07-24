export function validateLoginInput({
  email,
  password,
}) {
  if (!email?.trim()) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  return {
    email: email.trim().toLowerCase(),
    password,
  };
}