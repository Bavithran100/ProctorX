package com.example.ProctorX.Service;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.CodingQuestionEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface AuthService {
    void setUser(AuthEntity authEntity);
    AuthEntity findByEmail(String email);
    public AuthEntity getCurrentUser(Authentication authentication);
    List<AuthEntity> getUsers();
    void setApproval(Long id);

}
