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
    private AuthRepository authRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void setUser(AuthEntity authEntity) {
        if (authEntity.getPassword() != null && !authEntity.getPassword().isEmpty()) {
            String raw = authEntity.getPassword();
            authEntity.setPassword(passwordEncoder.encode(raw));
        }

        if (authEntity.getRole() == null) {
            authEntity.setRole(AuthEntity.Role.STUDENT);
        }

        // Generate a default unique username if not provided
        if (authEntity.getUsername() == null || authEntity.getUsername().trim().isEmpty()) {
            String base = authEntity.getEmail().split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
            String candidate = base;
            int counter = 1;
            while (authRepository.existsByUsername(candidate)) {
                candidate = base + counter++;
            }
            authEntity.setUsername(candidate);
        }

        authEntity.setEnabled(true);
        authRepository.save(authEntity);
    }

    @Override
    public AuthEntity findByEmail(String email) {
        return authRepository.findByEmail(email);
    }

    @Override
    public AuthEntity findByUsername(String username) {
        return authRepository.findByUsername(username).orElse(null);
    }

    @Override
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
    public List<AuthEntity> getUsers() {
        return authRepository.findAll();
    }

    @Override
    public void setApproval(Long id) {
        AuthEntity user = authRepository.findById(id).orElseThrow();
        user.setApproved(true);
        authRepository.save(user);
    }

    @Override
    public AuthEntity updateProfile(AuthEntity currentUser, AuthEntity updatedDetails) {
        if (updatedDetails.getName() != null && !updatedDetails.getName().trim().isEmpty()) {
            currentUser.setName(updatedDetails.getName().trim());
        }
        if (updatedDetails.getInstitution() != null) {
            currentUser.setInstitution(updatedDetails.getInstitution().trim());
        }
        if (updatedDetails.getDepartment() != null) {
            currentUser.setDepartment(updatedDetails.getDepartment().trim());
        }
        if (updatedDetails.getDesignation() != null) {
            currentUser.setDesignation(updatedDetails.getDesignation().trim());
        }
        if (updatedDetails.getBio() != null) {
            currentUser.setBio(updatedDetails.getBio().trim());
        }
        if (updatedDetails.getSkills() != null) {
            currentUser.setSkills(updatedDetails.getSkills().trim());
        }

        // Update username if requested and unique
        if (updatedDetails.getUsername() != null && !updatedDetails.getUsername().trim().isEmpty()) {
            String newUsername = updatedDetails.getUsername().trim().toLowerCase().replaceAll("[^a-z0-9_]", "");
            if (!newUsername.equals(currentUser.getUsername())) {
                if (authRepository.existsByUsername(newUsername)) {
                    throw new IllegalArgumentException("Username '" + newUsername + "' is already taken.");
                }
                currentUser.setUsername(newUsername);
            }
        }

        currentUser.setProfileCompleted(true);
        return authRepository.save(currentUser);
    }
}