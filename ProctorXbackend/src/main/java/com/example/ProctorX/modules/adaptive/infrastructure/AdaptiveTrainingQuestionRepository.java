package com.example.ProctorX.modules.adaptive.infrastructure;

import com.example.ProctorX.modules.adaptive.domain.AdaptiveTrainingQuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdaptiveTrainingQuestionRepository extends JpaRepository<AdaptiveTrainingQuestionEntity, Long> {
    List<AdaptiveTrainingQuestionEntity> findByTrainingExamId(Long trainingExamId);
}
