package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.PasswordResetTokenEntity;
import com.example.ProctorX.Repository.AuthRepository;
import com.example.ProctorX.Repository.PasswordResetTokenRepository;
import com.example.ProctorX.Service.EmailService;
import com.example.ProctorX.Service.PasswordResetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;

@Service
public class PasswordResetServiceImpl implements PasswordResetService {

    @Autowired
    private AuthRepository authRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    @Transactional
    public Map<String, Object> requestPasswordReset(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Please provide a valid email address.");
        }

        String sanitizedEmail = email.trim().toLowerCase();
        AuthEntity user = authRepository.findByEmail(sanitizedEmail);

        if (user == null) {
            // For security, return generic confirmation to prevent account enumeration
            return Map.of(
                    "message", "If an account matches " + sanitizedEmail + ", a password reset link has been dispatched.",
                    "success", true
            );
        }

        boolean isGoogleAccount = user.getPassword() == null ||
                                  user.getPassword().trim().isEmpty() ||
                                  user.getProvider() == AuthEntity.Provider.GOOGLE;

        // Clean up any existing active tokens for this user
        tokenRepository.deleteByUser(user);

        // Generate 32 cryptographically secure bytes (64 hex characters)
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String token = HexFormat.of().formatHex(randomBytes);

        PasswordResetTokenEntity resetToken = PasswordResetTokenEntity.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(30))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();

        tokenRepository.save(resetToken);

        String resetLink = String.format("%s/reset-password?token=%s", frontendUrl, token);
        emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), resetLink, isGoogleAccount);

        return Map.of(
                "message", isGoogleAccount
                        ? "Account registered via Google Sign-In. We sent instructions to " + sanitizedEmail + " on how to set up password login or sign in via Google."
                        : "A password reset link has been sent to " + sanitizedEmail + " (valid for 30 minutes).",
                "isGoogleAccount", isGoogleAccount,
                "success", true
        );
    }

    @Override
    public PasswordResetTokenEntity validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Password reset token is missing.");
        }

        PasswordResetTokenEntity resetToken = tokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or unrecognized password reset token."));

        if (Boolean.TRUE.equals(resetToken.getUsed())) {
            throw new IllegalStateException("This password reset token has already been used. Please request a new link.");
        }

        if (resetToken.isExpired()) {
            throw new IllegalStateException("This password reset token has expired (limit 30 minutes). Please request a fresh reset link.");
        }

        return resetToken;
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long.");
        }

        PasswordResetTokenEntity resetToken = validateToken(token);
        AuthEntity user = resetToken.getUser();

        // Encode and save new password
        user.setPassword(passwordEncoder.encode(newPassword));
        authRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }
}
