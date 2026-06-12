// CBE/utils/getLogoBase64.js
import fs from "fs";
import path from "path";

const logoPath = path.resolve(
  process.cwd(),
  "public",
  "logo.png"
);

export function getLogoBase64() {
  const file = fs.readFileSync(logoPath);

  return file.toString("base64");
}