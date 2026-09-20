package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.Entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

    Optional<PasswordResetTokenEntity> findByToken(String token);

    Optional<PasswordResetTokenEntity> findByUserAndUsedFalse(AuthEntity user);

    @Transactional
    @Modifying
    @Query("DELETE FROM PasswordResetTokenEntity t WHERE t.user = :user")
    void deleteByUser(@Param("user") AuthEntity user);

    @Transactional
    @Modifying
    @Query("DELETE FROM PasswordResetTokenEntity t WHERE t.expiryDate < :now OR t.used = true")
    void deleteExpiredOrUsedTokens(@Param("now") LocalDateTime now);
}
