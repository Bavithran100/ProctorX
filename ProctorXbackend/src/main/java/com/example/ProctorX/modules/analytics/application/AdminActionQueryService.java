package com.example.ProctorX.Service.Impl;

import com.example.ProctorX.Entity.AdminActionEntity;
import com.example.ProctorX.Entity.ExamSessionEntity;
import com.example.ProctorX.Entity.MalPracticeLogEntity;
import com.example.ProctorX.Repository.AdminActionRepository;
import com.example.ProctorX.Repository.MalPracticeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminActionQueryService {

    private final MalPracticeLogRepository logRepository;
    private final AdminActionRepository actionRepository;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllLogs() {
        return getAllLogs(null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllLogs(com.example.ProctorX.Entity.AuthEntity currentUser) {
        List<MalPracticeLogEntity> logs;
        try {
            logs = logRepository.findAllWithSessionStudentAndExam();
        } catch (Exception e) {
            logs = logRepository.findAllByOrderByTimestampDesc();
        }
        List<Map<String, Object>> result = new ArrayList<>();

        for (MalPracticeLogEntity log : logs) {
            ExamSessionEntity session = log.getSession();
            if (currentUser != null && currentUser.getRole() == com.example.ProctorX.Entity.AuthEntity.Role.COORDINATOR) {
                if (session == null || session.getExam() == null) continue;
                var exam = session.getExam();
                boolean matchCreatedBy = exam.getCreatedBy() != null && exam.getCreatedBy().equalsIgnoreCase(currentUser.getEmail());
                boolean matchCoordName = exam.getCoordinatorName() != null && (
                        exam.getCoordinatorName().equalsIgnoreCase(currentUser.getName()) ||
                        (currentUser.getName() != null && !currentUser.getName().isBlank() && exam.getCoordinatorName().equalsIgnoreCase(currentUser.getName())) ||
                        (currentUser.getEmail() != null && currentUser.getEmail().toLowerCase().startsWith(exam.getCoordinatorName().toLowerCase()))
                );
                if (!matchCreatedBy && !matchCoordName) {
                    continue;
                }
            }

            Map<String, Object> map = new HashMap<>();
            map.put("id", log.getId());
            map.put("eventType", log.getEventType() != null ? log.getEventType().name() : "OTHER");
            map.put("severity", log.getSeverity() != null ? log.getSeverity().name() : "LOW");
            map.put("timestamp", log.getTimestamp());
            map.put("occurrenceCount", log.getOccurrenceCount());

            if (session != null) {
                Map<String, Object> sessionMap = new HashMap<>();
                sessionMap.put("id", session.getId());

                if (session.getStudent() != null) {
                    Map<String, Object> studentMap = new HashMap<>();
                    studentMap.put("id", session.getStudent().getId());
                    studentMap.put("name", session.getStudent().getName());
                    studentMap.put("email", session.getStudent().getEmail());
                    studentMap.put("username", session.getStudent().getUsername());
                    sessionMap.put("student", studentMap);
                }

                if (session.getExam() != null) {
                    Map<String, Object> examMap = new HashMap<>();
                    examMap.put("id", session.getExam().getId());
                    examMap.put("title", session.getExam().getTitle());
                    examMap.put("coordinatorName", session.getExam().getCoordinatorName());
                    sessionMap.put("exam", examMap);
                }

                map.put("session", sessionMap);
            }

            result.add(map);
        }

        return result;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllActions() {
        return getAllActions(null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllActions(com.example.ProctorX.Entity.AuthEntity currentUser) {
        List<AdminActionEntity> actions;
        try {
            actions = actionRepository.findAllWithAdminSessionStudentAndExam();
        } catch (Exception e) {
            actions = actionRepository.findAllByOrderByTimestampDesc();
        }
        List<Map<String, Object>> result = new ArrayList<>();

        for (AdminActionEntity a : actions) {
            ExamSessionEntity session = a.getSession();
            if (currentUser != null && currentUser.getRole() == com.example.ProctorX.Entity.AuthEntity.Role.COORDINATOR) {
                if (session == null || session.getExam() == null) continue;
                var exam = session.getExam();
                boolean matchCreatedBy = exam.getCreatedBy() != null && exam.getCreatedBy().equalsIgnoreCase(currentUser.getEmail());
                boolean matchCoordName = exam.getCoordinatorName() != null && (
                        exam.getCoordinatorName().equalsIgnoreCase(currentUser.getName()) ||
                        (currentUser.getName() != null && !currentUser.getName().isBlank() && exam.getCoordinatorName().equalsIgnoreCase(currentUser.getName())) ||
                        (currentUser.getEmail() != null && currentUser.getEmail().toLowerCase().startsWith(exam.getCoordinatorName().toLowerCase()))
                );
                if (!matchCreatedBy && !matchCoordName) {
                    continue;
                }
            }

            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("action", a.getAction() != null ? a.getAction().name() : "OTHER");
            map.put("remark", a.getRemark());
            map.put("timestamp", a.getTimestamp());

            if (a.getAdmin() != null) {
                Map<String, Object> adminMap = new HashMap<>();
                adminMap.put("id", a.getAdmin().getId());
                adminMap.put("name", a.getAdmin().getName());
                adminMap.put("email", a.getAdmin().getEmail());
                map.put("admin", adminMap);
            }

            if (session != null) {
                Map<String, Object> sessionMap = new HashMap<>();
                sessionMap.put("id", session.getId());

                if (session.getStudent() != null) {
                    Map<String, Object> studentMap = new HashMap<>();
                    studentMap.put("id", session.getStudent().getId());
                    studentMap.put("name", session.getStudent().getName());
                    studentMap.put("email", session.getStudent().getEmail());
                    sessionMap.put("student", studentMap);
                }

                if (session.getExam() != null) {
                    Map<String, Object> examMap = new HashMap<>();
                    examMap.put("id", session.getExam().getId());
                    examMap.put("title", session.getExam().getTitle());
                    sessionMap.put("exam", examMap);
                }

                map.put("session", sessionMap);
            }

            result.add(map);
        }

        return result;
    }
}
