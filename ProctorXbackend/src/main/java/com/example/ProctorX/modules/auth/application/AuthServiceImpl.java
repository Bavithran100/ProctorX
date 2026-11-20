package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.OrganizationEntity;
import com.example.ProctorX.Repository.AuthRepository;
import com.example.ProctorX.Repository.OrganizationRepository;
import com.example.ProctorX.Service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private AuthRepository authRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.example.ProctorX.Service.UsernameBloomFilterService bloomFilterService;

    @Override
    public void setUser(AuthEntity authEntity) {
        if (authEntity.getPassword() != null && !authEntity.getPassword().isEmpty()) {
            String raw = authEntity.getPassword();
            authEntity.setPassword(passwordEncoder.encode(raw));
        }

        if (authEntity.getRole() == null) {
            authEntity.setRole(AuthEntity.Role.STUDENT);
        }

        // Validate or assign unique username using Bloom Filter
        String chosenUsername = authEntity.getUsername();
        if (chosenUsername != null && !chosenUsername.trim().isEmpty()) {
            String normalized = chosenUsername.trim().toLowerCase();
            if (!bloomFilterService.isUsernameAvailable(normalized)) {
                throw new IllegalArgumentException("The username '" + chosenUsername.trim() + "' is already taken. Please choose another username.");
            }
            authEntity.setUsername(normalized);
        } else {
            String candidate = authEntity.getEmail().split("@")[0].replaceAll("[^a-zA-Z0-9_]", "").toLowerCase();
            if (bloomFilterService.isUsernameAvailable(candidate)) {
                authEntity.setUsername(candidate);
            } else {
                throw new IllegalArgumentException("The default username '" + candidate + "' (derived from your email) is already in use. Please provide an explicit unique username.");
            }
        }

        authEntity.setEnabled(true);
        AuthEntity saved = authRepository.save(authEntity);
        bloomFilterService.registerUsername(saved.getUsername());
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

        // Link organization if not yet linked, or updating orgCode
        String requestedOrgCode = updatedDetails.getOrgCode();
        if (requestedOrgCode != null && !requestedOrgCode.trim().isEmpty()) {
            if (currentUser.getOrgCode() == null || !currentUser.getOrgCode().equalsIgnoreCase(requestedOrgCode.trim())) {
                Optional<OrganizationEntity> orgOpt = organizationRepository.findByOrgCode(requestedOrgCode.trim().toUpperCase());
                if (orgOpt.isEmpty()) {
                    orgOpt = organizationRepository.findByNameIgnoreCase(requestedOrgCode.trim());
                }
                if (orgOpt.isEmpty()) {
                    throw new IllegalArgumentException("No organization found with Organization ID / Code: " + requestedOrgCode);
                }
                OrganizationEntity org = orgOpt.get();
                if (Boolean.TRUE.equals(org.getIsLocked())) {
                    throw new IllegalArgumentException("Organization '" + org.getName() + "' is temporarily locked by platform administration.");
                }
                if (!"ACTIVE".equalsIgnoreCase(org.getPaymentStatus())) {
                    throw new IllegalArgumentException("Organization '" + org.getName() + "' has not completed institutional onboarding or plan activation yet.");
                }

                // Check seat quotas
                if (currentUser.getRole() == AuthEntity.Role.STUDENT) {
                    long currentStudentCount = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.STUDENT);
                    int maxStudents = org.getMaxStudentsQuota() != null ? org.getMaxStudentsQuota() : 500;
                    if (currentStudentCount >= maxStudents) {
                        throw new IllegalArgumentException("Organization '" + org.getName() + "' has reached its student seat limit (" + maxStudents + "). Contact your college administrator.");
                    }
                } else if (currentUser.getRole() == AuthEntity.Role.COORDINATOR) {
                    long currentCoordCount = authRepository.countByOrganizationIdAndRole(org.getId(), AuthEntity.Role.COORDINATOR);
                    int maxCoords = org.getMaxCoordinatorsQuota() != null ? org.getMaxCoordinatorsQuota() : 10;
                    if (currentCoordCount >= maxCoords) {
                        throw new IllegalArgumentException("Organization '" + org.getName() + "' has reached its coordinator seat limit (" + maxCoords + ").");
                    }
                }

                currentUser.setOrganizationId(org.getId());
                currentUser.setOrgCode(org.getOrgCode());
                currentUser.setOrganizationName(org.getName());
                currentUser.setInstitution(org.getName());
                currentUser.setCollegeAdminId(org.getCollegeAdminId());

                // Reset approval states for the new institution affiliation
                currentUser.setCollegeAdminApproved(false);
                currentUser.setCoordinatorApproved(false);
                currentUser.setCoordinatorId(null);
                currentUser.setApproved(false);
            }
        }

        if (updatedDetails.getInstitution() != null && (currentUser.getInstitution() == null || currentUser.getOrgCode() == null)) {
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

        // If user came via Google/OAuth and role is being selected before approval
        if (updatedDetails.getRole() != null && (currentUser.getRole() == null || currentUser.getRole() == AuthEntity.Role.STUDENT)) {
            if (!Boolean.TRUE.equals(currentUser.getApproved()) && !Boolean.TRUE.equals(currentUser.getCollegeAdminApproved())) {
                if (updatedDetails.getRole() == AuthEntity.Role.COORDINATOR || updatedDetails.getRole() == AuthEntity.Role.STUDENT) {
                    currentUser.setRole(updatedDetails.getRole());
                }
            }
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

        // Determine profile completeness: name, institution/orgCode, department, designation
        boolean hasName = currentUser.getName() != null && !currentUser.getName().trim().isEmpty();
        boolean hasOrg = (currentUser.getOrgCode() != null && !currentUser.getOrgCode().trim().isEmpty()) ||
                         (currentUser.getInstitution() != null && !currentUser.getInstitution().trim().isEmpty());
        boolean hasDept = currentUser.getDepartment() != null && !currentUser.getDepartment().trim().isEmpty();
        boolean hasDesig = currentUser.getDesignation() != null && !currentUser.getDesignation().trim().isEmpty();

        boolean isComplete = hasName && hasOrg && hasDept && hasDesig;
        currentUser.setProfileCompleted(isComplete);

        return authRepository.save(currentUser);
    }

    @Override
    public AuthEntity updateProfilePhoto(AuthEntity currentUser, String profileImageUrl, String faceEmbedding) {
        if (profileImageUrl != null && !profileImageUrl.trim().isEmpty()) {
            currentUser.setProfileImageUrl(profileImageUrl);
        }
        if (faceEmbedding != null && !faceEmbedding.trim().isEmpty()) {
            currentUser.setFaceEmbedding(faceEmbedding);
            currentUser.setFaceEnrolled(true);
        }
        return authRepository.save(currentUser);
    }
}