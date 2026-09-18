package com.example.ProctorX.Service;

import com.example.ProctorX.Entity.AuthEntity;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface AuthService {
    void setUser(AuthEntity authEntity);
    AuthEntity findByEmail(String email);
    AuthEntity findByUsername(String username);
    AuthEntity getCurrentUser(Authentication authentication);
    List<AuthEntity> getUsers();
    void setApproval(Long id);
    AuthEntity updateProfile(AuthEntity currentUser, AuthEntity updatedDetails);
}
