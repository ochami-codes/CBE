import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("Resend API key missing. Email skipped.");
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
