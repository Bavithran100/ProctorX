package com.example.ProctorX.modules.adaptive.infrastructure;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.modules.adaptive.domain.LearnerModelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LearnerModelRepository extends JpaRepository<LearnerModelEntity, Long> {
    Optional<LearnerModelEntity> findByUser(AuthEntity user);
    Optional<LearnerModelEntity> findByUserId(Long userId);
}
