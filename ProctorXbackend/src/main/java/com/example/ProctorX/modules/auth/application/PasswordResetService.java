package com.example.ProctorX.Service;

import com.example.ProctorX.Entity.PasswordResetTokenEntity;

import java.util.Map;

public interface PasswordResetService {

    Map<String, Object> requestPasswordReset(String email);

    PasswordResetTokenEntity validateToken(String token);

    void resetPassword(String token, String newPassword);
}
