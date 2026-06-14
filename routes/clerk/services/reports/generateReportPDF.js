import puppeteer from "puppeteer";

export async function generateReportPDF(html) {
  try {
    console.log("Starting Puppeteer launch");
    const browser = await puppeteer.launch({
      headless: true,
      args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
console.log("Puppeteer launched successfully");
  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  // FIXED (no waitForTimeout dependency)
  await new Promise((resolve) => setTimeout(resolve, 500));

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdf;
} catch (error){
  console.error("Puppeteer error:", error);
  throw error;
}}
