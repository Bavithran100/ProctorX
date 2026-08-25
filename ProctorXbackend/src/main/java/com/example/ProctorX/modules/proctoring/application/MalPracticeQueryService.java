package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.MalPracticeLogEntity;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.MalPracticeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MalPracticeQueryService {

    private final ExamSessionRepository sessionRepository;
    private final MalPracticeLogRepository logRepository;

    public List<MalPracticeLogEntity> getLogsBySession(Long sessionId) {

        ExamSessionEntity session = sessionRepository
                .findById(sessionId)
                .orElseThrow(() -> new RuntimeException("SESSION_NOT_FOUND"));

        return logRepository
                .findBySessionOrderByTimestampAsc(session);
    }
}
