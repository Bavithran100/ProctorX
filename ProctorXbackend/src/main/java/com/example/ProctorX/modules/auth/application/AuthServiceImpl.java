package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.AuthRepository;
import com.example.ProctorX.Service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    AuthRepository authRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Override
    public void setUser(AuthEntity authEntity) {
        // Encode the password before saving
        String raw = authEntity.getPassword();
        authEntity.setPassword(passwordEncoder.encode(raw));
        // default role if not set
        if (authEntity.getRole() == null) {
            authEntity.setRole(AuthEntity.Role.STUDENT);
        }
        authEntity.setEnabled(true);
        authRepository.save(authEntity);
    }
    @Override
    public AuthEntity findByEmail(String email) {
        return authRepository.findByEmail(email);
    }
    public AuthEntity getCurrentUser(Authentication authentication) {

        if (authentication == null) {
            throw new RuntimeException("User not authenticated");
        }

        String email;

        // GOOGLE LOGIN
        if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User oauthUser) {
            email = oauthUser.getAttribute("email");
        }
        // NORMAL LOGIN
        else {
            email = authentication.getName();
        }

        AuthEntity user = authRepository.findByEmail(email);

        if (user == null) {
            throw new RuntimeException("User not found for email: " + email);
        }

        return user;
    }
    @Override
    public List<AuthEntity> getUsers(){
        return authRepository.findAll();
    }
    @Override
    public  void setApproval(Long id){

        AuthEntity user = authRepository.findById(id)
                .orElseThrow();

        user.setApproved(true);

        authRepository.save(user);
    }




}