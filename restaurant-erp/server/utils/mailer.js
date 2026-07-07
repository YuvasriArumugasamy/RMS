const nodemailer = require('nodemailer');

/**
 * Send an email using SMTP credentials from .env
 *
 * Required .env vars:
 *   SMTP_HOST     e.g. smtp.gmail.com
 *   SMTP_PORT     e.g. 587
 *   SMTP_USER     your Gmail address
 *   SMTP_PASS     Gmail App Password (16 chars, no spaces)
 *   SMTP_FROM     display name + address  e.g. "RMS System <you@gmail.com>"
 */
const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false, // TLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
