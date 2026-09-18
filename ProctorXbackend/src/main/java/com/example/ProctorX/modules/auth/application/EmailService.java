package com.example.ProctorX.Service;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String userName, String resetLink, boolean isGoogleAccount);
}
