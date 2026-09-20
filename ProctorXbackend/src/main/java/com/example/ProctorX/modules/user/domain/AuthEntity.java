package com.example.ProctorX.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthEntity {

    public enum Role {
        STUDENT,
        COORDINATOR,
        ADMIN
    }

    public enum Provider {
        LOCAL,
        GOOGLE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    // nullable because Google users don't have password
    @Column(nullable = true)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    // approval required for students and coordinators before unlocking live exams & authoring
    @Builder.Default
    private Boolean approved = false;

    @Builder.Default
    private Boolean enabled = true;

    // Profile & Institution details
    @Column(nullable = true)
    private String institution;

    @Column(nullable = true)
    private String department;

    @Column(nullable = true)
    private String designation; // Year of study or Academic title

    @Column(columnDefinition = "TEXT", nullable = true)
    private String bio;

    @Column(nullable = true)
    private String skills;

    @Column(nullable = true, unique = true)
    private String username;

    @Builder.Default
    private Boolean profileCompleted = false;
}