package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Service.EmailService;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${resend.api-key:${RESEND_API_KEY:}}")
    private String resendApiKey;

    @Value("${resend.from-email:${RESEND_FROM_EMAIL:onboarding@resend.dev}}")
    private String resendFromEmail;

    @Value("${brevo.api-key:${BREVO_API_KEY:}}")
    private String brevoApiKey;

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

        log.info("=================================================");
        log.info("PASSWORD RESET LINK GENERATED FOR: {}", toEmail);
        log.info("RESET URL: {}", resetLink);
        log.info("ACCOUNT TYPE: {}", isGoogleAccount ? "GOOGLE_ONLY" : "STANDARD_LOCAL");
        log.info("=================================================");

        dispatchEmailAsync(toEmail, subject, plainText, htmlBody);
    }

    @Override
    public void sendExamScoreEmail(String toEmail, String studentName, String examTitle, String examType, int score, int totalMarks, String coordinatorName) {
        String greeting = studentName != null && !studentName.trim().isEmpty() ? studentName : "Candidate";
        int safeTotal = totalMarks > 0 ? totalMarks : 100;
        int percentage = Math.round(((float) score / safeTotal) * 100);
        boolean isPass = score >= (safeTotal / 2);
        String coordinator = coordinatorName != null && !coordinatorName.trim().isEmpty() ? coordinatorName : "Examination Committee";

        String subject = String.format("[ProctorX] Assessment Result: %s (%d/%d Marks)", examTitle, score, safeTotal);

        String plainText = String.format(
                "Hello %s,\n\n" +
                "Your assessment submission for '%s' has been successfully evaluated.\n\n" +
                "EVALUATION SUMMARY:\n" +
                "- Exam: %s (%s)\n" +
                "- Coordinator: %s\n" +
                "- Score: %d / %d Marks\n" +
                "- Percentage: %d%%\n" +
                "- Outcome: %s\n\n" +
                "You can view your complete historical assessment records by visiting:\n" +
                "%s/results\n\n" +
                "— The ProctorX Assessment Team",
                greeting, examTitle, examTitle, examType, coordinator, score, safeTotal, percentage,
                isPass ? "PASSED" : "NEEDS IMPROVEMENT", frontendUrl
        );

        String outcomeColor = isPass ? "#10B981" : "#F59E0B";
        String outcomeBadge = isPass ? "✓ PASSED" : "NEEDS IMPROVEMENT";

        String htmlBody = String.format(
                "<div style='font-family: Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto;'>" +
                "  <div style='text-align: center; margin-bottom: 24px;'>" +
                "    <h1 style='color: #6366F1; font-size: 24px; margin: 0;'>ProctorX Assessment Report</h1>" +
                "  </div>" +
                "  <div style='background-color: #1E293B; padding: 24px; border-radius: 8px; border: 1px solid #334155;'>" +
                "    <h2 style='font-size: 18px; color: #F8FAFC; margin-top: 0;'>Evaluation Summary</h2>" +
                "    <p style='color: #94A3B8; font-size: 14px;'>Hello <strong>%s</strong>, your official exam submission has been recorded and evaluated.</p>" +
                "    <div style='background: #0F172A; border: 1px solid #334155; border-radius: 8px; padding: 18px; margin: 20px 0;'>" +
                "      <div style='font-size: 16px; font-weight: bold; color: #F8FAFC; margin-bottom: 6px;'>%s</div>" +
                "      <div style='color: #06B6D4; font-size: 13px; margin-bottom: 12px;'>Type: %s · Supervised by: %s</div>" +
                "      <hr style='border: none; border-top: 1px solid #334155; margin: 12px 0;' />" +
                "      <div style='display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;'>" +
                "        <span style='color: #94A3B8;'>Score Awarded:</span>" +
                "        <strong style='color: #F8FAFC;'>%d / %d Marks</strong>" +
                "      </div>" +
                "      <div style='display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;'>" +
                "        <span style='color: #94A3B8;'>Percentage:</span>" +
                "        <strong style='color: #6366F1;'>%d%%</strong>" +
                "      </div>" +
                "      <div style='display: flex; justify-content: space-between; font-size: 14px;'>" +
                "        <span style='color: #94A3B8;'>Outcome:</span>" +
                "        <span style='color: %s; font-weight: bold;'>%s</span>" +
                "      </div>" +
                "    </div>" +
                "    <div style='text-align: center; margin: 24px 0 12px;'>" +
                "      <a href='%s/results' style='background: linear-gradient(135deg, #6366F1, #06B6D4); color: #FFFFFF; text-decoration: none; padding: 10px 24px; font-weight: bold; border-radius: 6px; font-size: 14px; display: inline-block;'>View Results & History →</a>" +
                "    </div>" +
                "    <p style='color: #64748B; font-size: 12px; text-align: center;'>Verified by ProctorX AI Proctoring Engine with on-device telemetry.</p>" +
                "  </div>" +
                "</div>",
                greeting, examTitle, examType, coordinator, score, safeTotal, percentage, outcomeColor, outcomeBadge, frontendUrl
        );

        log.info("=================================================");
        log.info("EXAM SCORE EVALUATION EMAIL DISPATCHED TO: {}", toEmail);
        log.info("EXAM: {} | SCORE: {}/{} ({}%) | OUTCOME: {}", examTitle, score, safeTotal, percentage, isPass ? "PASS" : "FAIL");
        log.info("=================================================");

        dispatchEmailAsync(toEmail, subject, plainText, htmlBody);
    }

    private void dispatchEmailAsync(String toEmail, String subject, String plainText, String htmlBody) {
        CompletableFuture.runAsync(() -> {
            // 1. Primary Cloud REST API: Resend HTTPS Port 443
            if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
                if (sendViaResend(toEmail, subject, plainText, htmlBody)) {
                    return;
                }
            }

            // 2. Secondary Cloud REST API: Brevo HTTPS Port 443
            if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
                if (sendViaBrevo(toEmail, subject, plainText, htmlBody)) {
                    return;
                }
            }

            log.warn("Email dispatch failed: No cloud email API keys configured (RESEND_API_KEY).");
        });
    }

    private boolean sendViaResend(String toEmail, String subject, String plainText, String htmlBody) {
        try {
            String from = resendFromEmail;
            if (from == null || from.trim().isEmpty() || from.contains("@gmail.com") || from.contains("@yahoo.com") || from.contains("@outlook.com") || from.contains("@hotmail.com")) {
                from = "ProctorX <onboarding@resend.dev>";
            }

            Map<String, Object> payload = Map.of(
                    "from", from,
                    "to", List.of(toEmail),
                    "subject", subject,
                    "html", htmlBody,
                    "text", plainText
            );

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.resend.com/emails"))
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Email successfully dispatched via Resend API (HTTPS Port 443) to: {}", toEmail);
                return true;
            } else {
                log.warn("Resend API response (code {}): {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.warn("Resend API dispatch error: {}", e.getMessage());
            return false;
        }
    }

    private boolean sendViaBrevo(String toEmail, String subject, String plainText, String htmlBody) {
        try {
            String senderEmail = "noreply@proctorx.com";
            Map<String, Object> payload = Map.of(
                    "sender", Map.of("name", "ProctorX Platform", "email", senderEmail),
                    "to", List.of(Map.of("email", toEmail)),
                    "subject", subject,
                    "htmlContent", htmlBody,
                    "textContent", plainText
            );

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .header("api-key", brevoApiKey.trim())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Email successfully dispatched via Brevo API to: {}", toEmail);
                return true;
            } else {
                log.warn("Brevo API response (code {}): {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.warn("Brevo API dispatch error: {}", e.getMessage());
            return false;
        }
    }
}
