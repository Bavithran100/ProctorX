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

    // coordinator must be approved
    @Builder.Default
    private Boolean approved = true;

    @Builder.Default
    private Boolean enabled = true;
}