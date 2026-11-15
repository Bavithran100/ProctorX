package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuthRepository extends JpaRepository<AuthEntity, Long> {
    AuthEntity findByEmail(String email);
    Optional<AuthEntity> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmail(String email);

    @Query("SELECT u.username FROM AuthEntity u WHERE u.username IS NOT NULL")
    List<String> findAllUsernames();
}
