export const normalizeKenyanPhone = (phone = "") => {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("254")) {
    return cleaned;
  }

  if (
    cleaned.length === 10 &&
    cleaned.startsWith("0")
  ) {
    return `254${cleaned.slice(1)}`;
  }

  return cleaned;
};

export const isValidKenyanPhone = (phone) => {
  const normalized = normalizeKenyanPhone(phone);

  return /^254(7\d{8}|1\d{8})$/.test(normalized);
};
