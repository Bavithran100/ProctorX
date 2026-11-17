package com.example.ProctorX.modules.adaptive.web;

import com.example.ProctorX.modules.adaptive.application.AdaptiveEngineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/adaptive-tester")
public class AdaptiveTesterController {

    private final AdaptiveEngineService adaptiveEngineService;

    @Autowired
    public AdaptiveTesterController(AdaptiveEngineService adaptiveEngineService) {
        this.adaptiveEngineService = adaptiveEngineService;
    }

    /**
     * 1. Dynamically fetch available models from Groq API endpoint
     */
    @GetMapping("/groq-models")
    public ResponseEntity<Map<String, Object>> getGroqModels() {
        return ResponseEntity.ok(adaptiveEngineService.fetchAvailableGroqModels());
    }

    /**
     * 2. List all students with learner model for test loading
     */
    @GetMapping("/students")
    public ResponseEntity<List<Map<String, Object>>> getStudents() {
        return ResponseEntity.ok(adaptiveEngineService.getLearnerProfilesForAdmin());
    }

    /**
     * 3. Fetch full 35-dimensional cognitive vector for a learner
     */
    @GetMapping("/student-vector/{learnerModelId}")
    public ResponseEntity<Map<String, Object>> getStudentVector(@PathVariable Long learnerModelId) {
        Map<String, Object> vector = adaptiveEngineService.getLearner35Vector(learnerModelId);
        if (vector.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(vector);
    }

    /**
     * 4. Generate a single vector-calibrated adaptive question using specified model & cognitive parameters
     */
    @PostMapping("/generate-question")
    public ResponseEntity<Map<String, Object>> generateTestQuestion(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.testGenerateSingleAdaptiveQuestion(payload));
    }

    /**
     * 5. Simulate code execution evaluation & real-time Bayesian / IRT vector recalibration (Full 35-Feature Pipeline)
     */
    @PostMapping("/simulate-eval")
    public ResponseEntity<Map<String, Object>> simulateEvaluation(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.simulateVectorEvaluation(payload));
    }

    /**
     * 6. Generate 100% verified AI reference solution tailored to this exact question and test cases
     */
    @PostMapping("/generate-solution")
    public ResponseEntity<Map<String, Object>> generateSolution(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.testGenerateReferenceSolution(payload));
    }

    /**
     * 6b. Generate Naive Brute-Force Solution (O(N^2) / Inefficient) to test real physical sandbox Time Limit Exceeded (TLE)
     */
    @PostMapping("/generate-bruteforce-solution")
    public ResponseEntity<Map<String, Object>> generateBruteforceSolution(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.testGenerateBruteforceSolution(payload));
    }

    /**
     * 7. Inject intentional AI defect (OFF_BY_ONE, BOUNDARY_CONDITION, NULL_EMPTY_HANDLING, TLE, etc.)
     */
    @PostMapping("/generate-buggy-code")
    public ResponseEntity<Map<String, Object>> generateBuggyCode(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.testGenerateBuggyCode(payload));
    }

    /**
     * 8. AI Deep Diagnostic: Analyze student code, runtime error, and failing test case to pinpoint cognitive defect
     */
    @PostMapping("/diagnose-defect")
    public ResponseEntity<Map<String, Object>> diagnoseDefect(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.testDiagnoseCodeDefect(payload));
    }

    /**
     * 9. Fetch Curated 5 Foundational Pattern Probes for Initial Diagnostic Assessment
     */
    @GetMapping("/diagnostic-probes")
    public ResponseEntity<List<Map<String, Object>>> getDiagnosticProbes() {
        return ResponseEntity.ok(adaptiveEngineService.getCuratedDiagnosticProbes());
    }

    /**
     * 10. Simulate 5-Probe Initial Diagnostic Assessment (Strict 0% to 30% Bronze Calibration - Zero Bypass)
     */
    @PostMapping("/simulate-diagnostic")
    public ResponseEntity<Map<String, Object>> simulateDiagnostic(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.simulateDiagnosticAssessment(payload));
    }

    /**
     * 11. Simulate 3-Question Sequential Exam Replay (Markov Bayesian Propagation with Difficulty Ceilings & Volume Gates)
     */
    @PostMapping("/simulate-3q-replay")
    public ResponseEntity<Map<String, Object>> simulate3QuestionReplay(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(adaptiveEngineService.simulate3QuestionSequentialReplay(payload));
    }
}
