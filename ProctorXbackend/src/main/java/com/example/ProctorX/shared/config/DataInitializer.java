package com.example.ProctorX.Config;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Repository.AuthRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final AuthRepository authRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdminAccount();
        seedCoordinatorAccount();
        seedBavithranAccount();
        seedStudentAccount();
    }

    private void seedAdminAccount() {
        String email = "admin@proctorx.com";
        if (authRepository.findByEmail(email) == null) {
            AuthEntity admin = AuthEntity.builder()
                    .name("System Administrator")
                    .email(email)
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .role(AuthEntity.Role.ADMIN)
                    .provider(AuthEntity.Provider.LOCAL)
                    .approved(true)
                    .enabled(true)
                    .profileCompleted(true)
                    .institution("ProctorX Academic Security")
                    .department("Information Technology")
                    .designation("Chief System Administrator")
                    .bio("System Administrator overseeing examinations, student approvals, and real-time proctoring security.")
                    .skills("System Administration, Academic Proctoring, Security Compliance")
                    .build();

            authRepository.save(admin);
            log.info("✓ [SEED] Created default ADMIN account: {} (password: admin123)", email);
        }
    }

    private void seedCoordinatorAccount() {
        String email = "coordinator@proctorx.com";
        if (authRepository.findByEmail(email) == null) {
            AuthEntity coordinator = AuthEntity.builder()
                    .name("Lead Coordinator")
                    .email(email)
                    .username("coordinator")
                    .password(passwordEncoder.encode("coord123"))
                    .role(AuthEntity.Role.COORDINATOR)
                    .provider(AuthEntity.Provider.LOCAL)
                    .approved(true)
                    .enabled(true)
                    .profileCompleted(true)
                    .institution("ProctorX University")
                    .department("Computer Science & Engineering")
                    .designation("Senior Assessment Coordinator")
                    .bio("Coordinator creating and overseeing MCQ assessments, DSA coding exams, and live student candidate monitoring.")
                    .skills("Algorithms, Data Structures, Assessment Authoring, Proctoring")
                    .build();

            authRepository.save(coordinator);
            log.info("✓ [SEED] Created default COORDINATOR account: {} (password: coord123)", email);
        }
    }

    private void seedBavithranAccount() {
        String email = "bavithrannatarajan@gmail.com";
        AuthEntity existing = authRepository.findByEmail(email);
        if (existing == null) {
            AuthEntity bavithran = AuthEntity.builder()
                    .name("Bavithran N")
                    .email(email)
                    .username("bavithran")
                    .password(passwordEncoder.encode("password123"))
                    .role(AuthEntity.Role.COORDINATOR)
                    .provider(AuthEntity.Provider.LOCAL)
                    .approved(true)
                    .enabled(true)
                    .profileCompleted(true)
                    .institution("ProctorX Engineering")
                    .department("Computer Science & Engineering")
                    .designation("Full Stack Developer & Examination Lead")
                    .bio("Creator of ProctorX AI-driven proctoring and adaptive learning platform.")
                    .skills("Java, Spring Boot, React, AI Proctoring, Computer Vision, DSA")
                    .build();

            authRepository.save(bavithran);
            log.info("✓ [SEED] Created coordinator account for {}: password is password123", email);
        } else if (existing.getPassword() == null || existing.getPassword().trim().isEmpty() || !existing.getApproved()) {
            existing.setPassword(passwordEncoder.encode("password123"));
            existing.setApproved(true);
            existing.setRole(AuthEntity.Role.COORDINATOR);
            existing.setProfileCompleted(true);
            authRepository.save(existing);
            log.info("✓ [SEED] Updated existing account {} with active password and approval.", email);
        }
    }

    private void seedStudentAccount() {
        String email = "student@proctorx.com";
        if (authRepository.findByEmail(email) == null) {
            AuthEntity student = AuthEntity.builder()
                    .name("Alex Student")
                    .email(email)
                    .username("alexstudent")
                    .password(passwordEncoder.encode("student123"))
                    .role(AuthEntity.Role.STUDENT)
                    .provider(AuthEntity.Provider.LOCAL)
                    .approved(true)
                    .enabled(true)
                    .profileCompleted(true)
                    .institution("ProctorX University")
                    .department("Computer Science")
                    .designation("3rd Year Undergraduate")
                    .bio("Aspiring software engineer taking computer science assessments.")
                    .skills("Java, Python, C++, Data Structures, Algorithms")
                    .build();

            authRepository.save(student);
            log.info("✓ [SEED] Created default STUDENT account: {} (password: student123)", email);
        }
    }
}
