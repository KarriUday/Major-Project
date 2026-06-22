const nodemailer = require('nodemailer');

let transporter = null;

const initializeTransporter = async () => {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.verify();
    console.log('[Email] SMTP configured successfully');
  } catch (error) {
    console.error('[Email] Configuration failed:', error.message);
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.warn('[Email] Transporter not initialized');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error('[Email] Send failed:', error.message);
    return false;
  }
};

module.exports = { initializeTransporter, sendEmail };
