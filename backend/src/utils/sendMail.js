import nodemailer from "nodemailer";

export async function sendOtpEmail(
  to,
  otp,
  subject = "Mã xác thực OTP"
) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASS) {
    throw new Error("SMTP chưa được cấu hình (thiếu SMTP_EMAIL/SMTP_PASS)");
  }

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true";
  const smtpRequireTls =
    String(process.env.SMTP_REQUIRE_TLS || "true") === "true";

  const connectionTimeout = Number(
    process.env.SMTP_CONNECTION_TIMEOUT || 30000
  );
  const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT || 30000);
  const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT || 45000);

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: smtpRequireTls,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.verify();

  await transporter.sendMail({
    from: `"VolunteerHub" <${process.env.SMTP_EMAIL}>`,
    to,
    subject,
    html: `
      <h2>📌 Mã OTP của bạn là: <b>${otp}</b></h2>
      <p>OTP có hiệu lực trong 5 phút. Không chia sẻ mã này cho bất kỳ ai.</p>
    `,
  });
}
