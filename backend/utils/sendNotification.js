import nodemailer from 'nodemailer'

export const sendNotification = async (to, subject, message) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.EMAIL_USER,   // e.g. kejahook@gmail.com
        pass: process.env.EMAIL_PASS    // Use App Password for Gmail
      }
    });

    await transporter.sendMail({
      from: `"Kejahook" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; padding: 10px;">
          <h2>${subject}</h2>
          <p>${message}</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
};


