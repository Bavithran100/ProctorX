package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Service.EmailService;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Override
    public void sendPasswordResetEmail(String toEmail, String userName, String resetLink, boolean isGoogleAccount) {
        String greeting = userName != null && !userName.trim().isEmpty() ? userName : "ProctorX User";
        String subject;
        String htmlBody;
        String plainText;

        if (isGoogleAccount) {
            subject = "[ProctorX] Google Account Notice & Password Setup";
            plainText = String.format(
                    "Hello %s,\n\n" +
                    "We received a password reset request for this email address. Your ProctorX account was originally created using Google Sign-In, so you do not currently have a separate manual password.\n\n" +
                    "You can continue logging in directly with Google by choosing 'Sign In with Google Account'.\n\n" +
                    "If you would like to set up a manual password to enable email & password sign-in as well, please open the following link (valid for 30 minutes):\n" +
                    "%s\n\n" +
                    "If you did not make this request, you can safely ignore this email.\n\n" +
                    "— The ProctorX Security Team",
                    greeting, resetLink
            );

            htmlBody = String.format(
                    "<div style='font-family: Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto;'>" +
                    "  <div style='text-align: center; margin-bottom: 24px;'>" +
                    "    <h1 style='color: #6366F1; font-size: 24px; margin: 0;'>ProctorX Security Gateway</h1>" +
                    "  </div>" +
                    "  <div style='background-color: #1E293B; padding: 24px; border-radius: 8px; border: 1px solid #334155;'>" +
                    "    <h2 style='font-size: 18px; color: #F8FAFC; margin-top: 0;'>Google Sign-In Account Notice</h2>" +
                    "    <p style='color: #94A3B8; font-size: 14px; line-height: 1.6;'>Hello <strong>%s</strong>,</p>" +
                    "    <p style='color: #94A3B8; font-size: 14px; line-height: 1.6;'>" +
                    "      We received a password reset request for your account. Your ProctorX account is registered via <strong>Google Sign-In</strong>." +
                    "    </p>" +
                    "    <p style='color: #94A3B8; font-size: 14px; line-height: 1.6;'>" +
                    "      You can always sign in instantly using your Google account. However, if you wish to create a dedicated password for email login, click below:" +
                    "    </p>" +
                    "    <div style='text-align: center; margin: 28px 0;'>" +
                    "      <a href='%s' style='background: linear-gradient(135deg, #6366F1, #06B6D4); color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 6px; font-size: 15px; display: inline-block;'>Set Manual Password (30 Min)</a>" +
                    "    </div>" +
                    "    <p style='color: #64748B; font-size: 12px;'>If you did not request this, you can safely disregard this email. Your Google login remains secure.</p>" +
                    "  </div>" +
                    "</div>",
                    greeting, resetLink
            );
        } else {
            subject = "[ProctorX] Reset Your Account Password";
            plainText = String.format(
                    "Hello %s,\n\n" +
                    "We received a request to reset the password for your ProctorX account.\n\n" +
                    "Please click the link below to set a new password (valid for 30 minutes):\n" +
                    "%s\n\n" +
                    "If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized activity.\n\n" +
                    "— The ProctorX Security Team",
                    greeting, resetLink
            );

            htmlBody = String.format(
                    "<div style='font-family: Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto;'>" +
                    "  <div style='text-align: center; margin-bottom: 24px;'>" +
                    "    <h1 style='color: #6366F1; font-size: 24px; margin: 0;'>ProctorX Security Gateway</h1>" +
                    "  </div>" +
                    "  <div style='background-color: #1E293B; padding: 24px; border-radius: 8px; border: 1px solid #334155;'>" +
                    "    <h2 style='font-size: 18px; color: #F8FAFC; margin-top: 0;'>Password Reset Request</h2>" +
                    "    <p style='color: #94A3B8; font-size: 14px; line-height: 1.6;'>Hello <strong>%s</strong>,</p>" +
                    "    <p style='color: #94A3B8; font-size: 14px; line-height: 1.6;'>" +
                    "      We received a request to reset your password. Click the button below to choose a new password:" +
                    "    </p>" +
                    "    <div style='text-align: center; margin: 28px 0;'>" +
                    "      <a href='%s' style='background: linear-gradient(135deg, #6366F1, #06B6D4); color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 6px; font-size: 15px; display: inline-block;'>Reset Password (30 Min)</a>" +
                    "    </div>" +
                    "    <p style='color: #64748B; font-size: 12px;'>This link will expire in 30 minutes. If you did not make this request, you can safely ignore this email.</p>" +
                    "  </div>" +
                    "</div>",
                    greeting, resetLink
            );
        }

        // Always log the reset link to stdout/logger for frictionless local developer testing!
        log.info("=================================================");
        log.info("PASSWORD RESET LINK GENERATED FOR: {}", toEmail);
        log.info("RESET URL: {}", resetLink);
        log.info("ACCOUNT TYPE: {}", isGoogleAccount ? "GOOGLE_ONLY" : "STANDARD_LOCAL");
        log.info("=================================================");

        // If JavaMailSender is available and configured with a from address, send real email
        if (mailSender != null && fromEmail != null && !fromEmail.trim().isEmpty()) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromEmail, "ProctorX Platform");
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(plainText, htmlBody);

                mailSender.send(message);
                log.info("Password reset email successfully dispatched to: {}", toEmail);
            } catch (Exception e) {
                log.warn("Could not dispatch email via SMTP (using console link fallback): {}", e.getMessage());
            }
        }
    }
}
