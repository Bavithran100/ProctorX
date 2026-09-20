package com.example.ProctorX.modules.adaptive.infrastructure;

import com.example.ProctorX.Entity.AuthEntity;
import com.example.ProctorX.modules.adaptive.domain.AdaptiveTrainingExamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdaptiveTrainingExamRepository extends JpaRepository<AdaptiveTrainingExamEntity, Long> {
    List<AdaptiveTrainingExamEntity> findByUserOrderByStartedAtDesc(AuthEntity user);
    List<AdaptiveTrainingExamEntity> findByUserIdOrderByStartedAtDesc(Long userId);
}
