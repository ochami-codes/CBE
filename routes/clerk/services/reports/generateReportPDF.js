import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";

export async function generateReportPDF(html) {
  try {
    console.log("Starting Puppeteer launch");

    const isProd = process.env.NODE_ENV === "production";

    const browser = await puppeteer.launch({
      headless: isProd ? chromium.headless : "new",

      args: isProd
        ? chromium.args
        : ["--no-sandbox", "--disable-setuid-sandbox"],

      executablePath: isProd
        ? await chromium.executablePath()
        : undefined,
    });

    console.log("Puppeteer launched successfully");

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return pdf;
  } catch (error) {
    console.error("Puppeteer error:", error);
    throw error;
  }
}