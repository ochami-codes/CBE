import { Resend } from "resend";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 */
export async function sendInviteEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Resend API key missing. Email skipped.");
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev", // default domain
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
