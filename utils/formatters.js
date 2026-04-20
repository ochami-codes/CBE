export const toNameCase = (str = "") =>
  str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word =>
      word
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join("-")
    )
    .join(" ");

export const toTitleCase = (str = "") =>
  str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
