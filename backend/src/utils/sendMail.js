import nodemailer from "nodemailer";

const toSafeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export async function sendOtpEmail(
  to,
  otp,
  subject = "Mã xác thực OTP"
) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASS) {
    throw new Error("SMTP chưa được cấu hình (thiếu SMTP_EMAIL/SMTP_PASS)");
  }

  const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpPort = toSafeNumber(process.env.SMTP_PORT, 587);
  const smtpSecure =
    String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const smtpRequireTls =
    String(process.env.SMTP_REQUIRE_TLS || "true").toLowerCase() === "true";

  const connectionTimeout = toSafeNumber(
    process.env.SMTP_CONNECTION_TIMEOUT,
    30000
  );
  const greetingTimeout = toSafeNumber(process.env.SMTP_GREETING_TIMEOUT, 30000);
  const socketTimeout = toSafeNumber(process.env.SMTP_SOCKET_TIMEOUT, 45000);

  const attempts = [];

  // Ưu tiên cấu hình từ env
  attempts.push({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: smtpRequireTls,
    label: `env(${smtpHost}:${smtpPort}, secure=${smtpSecure})`,
  });

  // Fallback cho Gmail khi môi trường deploy bị timeout/chặn mode cụ thể
  if (smtpHost.includes("gmail")) {
    attempts.push({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      label: "gmail-starttls(587)",
    });
    attempts.push({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      requireTLS: false,
      label: "gmail-ssl(465)",
    });
  }

  const uniqueAttempts = attempts.filter(
    (cfg, i, arr) =>
      i ===
      arr.findIndex(
        (x) =>
          x.host === cfg.host &&
          x.port === cfg.port &&
          x.secure === cfg.secure &&
          x.requireTLS === cfg.requireTLS
      )
  );

  const errors = [];

  console.log(
    `[OTP][MAIL] Start send to=${to}, host=${smtpHost}, port=${smtpPort}, secure=${smtpSecure}, attempts=${uniqueAttempts.length}`
  );

  for (const cfg of uniqueAttempts) {
    try {
      console.log(
        `[OTP][MAIL] Trying ${cfg.label} -> ${cfg.host}:${cfg.port} secure=${cfg.secure} requireTLS=${cfg.requireTLS}`
      );

      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        requireTLS: cfg.requireTLS,
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"VolunteerHub" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        html: `
          <h2>📌 Mã OTP của bạn là: <b>${otp}</b></h2>
          <p>OTP có hiệu lực trong 5 phút. Không chia sẻ mã này cho bất kỳ ai.</p>
        `,
      });

      console.log(`[OTP][MAIL] Sent successfully via ${cfg.label} to ${to}`);

      return;
    } catch (err) {
      console.error(
        `[OTP][MAIL] Failed via ${cfg.label}:`,
        err?.code,
        err?.message
      );
      errors.push(`${cfg.label}: ${err?.code || "NO_CODE"} - ${err?.message || "Unknown error"}`);
    }
  }

  throw new Error(`Gửi OTP thất bại qua tất cả SMTP configs. ${errors.join(" | ")}`);
}
