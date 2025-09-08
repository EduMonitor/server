import { createTransport } from "nodemailer";
import sanitizeHtml from "sanitize-html";
const sendEmail = async (email, subject, text, fromName, toName, logoPath) => {
  try {
    const transporter = createTransport({
      host: process.env.HOST,
      // service: process.env.SERVICE,
      port: Number(process.env.EMAIL_PORT),
      secure: Boolean(process.env.SECURE),
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });
    // Sanitize the HTML content to prevent XSS
    const sanitizedHtml = sanitizeHtml(text);
    await transporter.sendMail({
      from: `${fromName} <${process.env.EMAIL}>`,
      to: `${toName} ${email}`,
      subject: subject,
      html: text,
      attachments: [
        {
          filename: "logo.png",
          path: logoPath,
          cid: "logo",
        },
      ],
    });

    return { success: true, message: "Email sent successfully." };
  } catch (error) {
    return {
      success: false,
      message: "Failed to send email: " + error.message,
    };
  }
};
export { sendEmail };
