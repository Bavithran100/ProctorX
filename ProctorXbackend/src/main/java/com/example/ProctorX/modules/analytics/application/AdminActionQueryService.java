package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AdminActionEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.MalPracticeLogEntity;
import com.example.ProctorX.Repository.AdminActionRepository;
import com.example.ProctorX.Repository.ExamSessionRepository;
import com.example.ProctorX.Repository.MalPracticeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminActionQueryService {

    private final MalPracticeLogRepository logRepository;

    public List<MalPracticeLogEntity> getAllLogs() {
        return logRepository.findAllByOrderByTimestampDesc();
    }
    private final AdminActionRepository actionRepository;

    public List<AdminActionEntity> getAllActions() {
        return actionRepository.findAllByOrderByTimestampDesc();
    }
}

