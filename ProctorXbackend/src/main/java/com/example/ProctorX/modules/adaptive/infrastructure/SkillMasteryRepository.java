package com.example.ProctorX.modules.adaptive.infrastructure;

import com.example.ProctorX.modules.adaptive.domain.SkillMasteryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkillMasteryRepository extends JpaRepository<SkillMasteryEntity, Long> {
    List<SkillMasteryEntity> findByLearnerModelId(Long learnerModelId);
}
