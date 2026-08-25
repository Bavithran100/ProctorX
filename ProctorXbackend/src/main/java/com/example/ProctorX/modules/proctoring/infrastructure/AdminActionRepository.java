package com.example.ProctorX.Repository;

import com.example.ProctorX.Entity.AdminActionEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminActionRepository
        extends JpaRepository<AdminActionEntity, Long> {

    List<AdminActionEntity>
    findBySessionOrderByTimestampAsc(ExamSessionEntity session);

    List<AdminActionEntity> findAllByOrderByTimestampDesc();
}
