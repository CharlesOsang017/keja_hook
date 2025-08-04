import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
import {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE,
} from "./emailTemplates.js";

dotenv.config();

sgMail.setApiKey(process.env.SEND_GRID_API);

const fromEmail = process.env.FROM_EMAIL;

// send email
export const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: `Keja Hook <${fromEmail}>`,
    subject,
    html,
  };
  try {
    await sgMail.send(msg);
    console.log("Email sent successfully!");
  } catch (error) {
    console.log("Error sending email", error);
    return false;
  }
};

// send verification email
export const sendVerificationEmail = async (email, verificationToken) => {
  const recipient = [{ email }];
  const sender = process.env.FROM_EMAIL;
  const msg = {
    from: sender,
    to: recipient,
    subject: "Verify your email",
    html: VERIFICATION_EMAIL_TEMPLATE.replace(
      "{verificationCode}",
      verificationToken
    ),
    category: "Email Verification",
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent successfully");
  } catch (error) {
    console.error(`Error sending verification`, error);

    throw new Error(`Error sending verification email: ${error}`);
  }
};

// send welcome email
export const sendWelcomeEmail = async (email, subject, name) => {
  const recipient = [{ email }];
  const sender = process.env.FROM_EMAIL;
  const msg = {
    from: sender,
    to: recipient,
    template_uuid: "9bcb3a7b-9733-43a9-8f80-640d9666b4f8",
    template_variables: {
      company_info_name: "Keja Hook",
      name: name,
    },
    subject: subject,
  };

  try {
    await sgMail.send(msg);
    console.log("Welcome email sent successfully");
  } catch (error) {
    console.error(`Error sending welcome email`, error);

    throw new Error(`Error sending welcome email: ${error}`);
  }
};

// send passwordResetRequest email
export const sendPasswordResetEmail = async (email, resetURL) => {
  const recipient = [{ email }];
  const sender = process.env.FROM_EMAIL;
  const msg = {
    from: sender,
    to: recipient,
    subject: "Reset your password",
    html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
    category: "Password Reset",
  };
  try {
    await sgMail.send(msg);
    console.log("Password reset email sent successfully");
  } catch (error) {
    console.error(`Error sending password reset email`, error);

    throw new Error(`Error sending password reset email: ${error}`);
  }
};

// send successfull password reset email
export const sendResetSuccessEmail = async (email) => {
  const recipient = [{ email }];
  const sender = process.env.FROM_EMAIL;
  const msg = {
    from: sender,
    to: recipient,
    subject: "Password Reset Successful",
    html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    category: "Password Reset",
  };

  try {
    await sgMail.send(msg);

    console.log("Password reset email sent successfully");
  } catch (error) {
    console.error(`Error sending password reset success email`, error);
    throw new Error(`Error sending password reset success email: ${error}`);
  }
};
