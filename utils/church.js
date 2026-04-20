import { toTitleCase } from "./formatters.js";

export const sanitizeChurchBaseName = (name = "") =>
  name
    .replace(/\b(sda|church|seventh day adventist)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

export const buildFullChurchName = (baseName) =>
  `${toTitleCase(baseName)} SDA Church`;

export const generateChurchCode = (name = "") =>
  name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
