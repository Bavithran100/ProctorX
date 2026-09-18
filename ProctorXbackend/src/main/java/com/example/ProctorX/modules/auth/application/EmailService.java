package com.example.ProctorX.Service;

public interface EmailService {
    void sendPasswordResetEmail(String toEmail, String userName, String resetLink, boolean isGoogleAccount);

    void sendExamScoreEmail(String toEmail, String studentName, String examTitle, String examType, int score, int totalMarks, String coordinatorName);
}
