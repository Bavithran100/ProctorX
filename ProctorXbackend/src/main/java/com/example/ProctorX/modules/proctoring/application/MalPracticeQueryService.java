package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.MalPracticeLogEntity;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.MalPracticeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class MalPracticeQueryService {

    private final ExamSessionRepository sessionRepository;
    private final MalPracticeLogRepository logRepository;

    public List<Map<String, Object>> getLogsBySession(Long sessionId) {

        ExamSessionEntity session = sessionRepository
                .findById(sessionId)
                .orElseThrow(() -> new RuntimeException("SESSION_NOT_FOUND"));

        List<MalPracticeLogEntity> logs = logRepository
                .findBySessionOrderByTimestampAsc(session);

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (MalPracticeLogEntity log : logs) {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", log.getId());
            map.put("eventType", log.getEventType() != null ? log.getEventType().name() : "OTHER");
            map.put("severity", log.getSeverity() != null ? log.getSeverity().name() : "LOW");
            map.put("timestamp", log.getTimestamp());
            map.put("occurrenceCount", log.getOccurrenceCount());
            result.add(map);
        }

        return result;
    }
}
