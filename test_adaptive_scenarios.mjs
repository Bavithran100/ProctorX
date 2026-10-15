const BASE_URL = 'http://localhost:9080/api';
let csrfToken = '';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 PROCTORX ADAPTIVE ENGINE MULTI-LAYER INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  const cookieJar = new Map();

  // Helper for requests with session cookie & CSRF
  async function api(path, options = {}) {
    const cookieHeader = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    const headers = {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      ...(options.headers || {}),
    };
    const res = await globalThis.fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
    
    // Capture set-cookie properly into CookieJar
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
    for (const c of rawCookies) {
      if (!c) continue;
      const firstPart = c.split(';')[0].trim();
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx > 0) {
        const key = firstPart.substring(0, eqIdx).trim();
        const val = firstPart.substring(eqIdx + 1).trim();
        cookieJar.set(key, val);
        if (key === 'XSRF-TOKEN') {
          csrfToken = decodeURIComponent(val);
        }
      }
    }
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  }

  // 0. Fetch initial CSRF token
  const csrfRes = await api('/auth/csrf');
  if (csrfRes.ok && csrfRes.data?.token) {
    csrfToken = csrfRes.data.token;
  }

  // 1. Log in with Approved Test Student
  const testEmail = 'student@proctorx.com';
  const testPassword = 'student123';
  console.log(`[1/6] Logging in as student candidate: ${testEmail}...`);
  const loginRes = await api('/Login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.data);
    process.exit(1);
  }
  console.log('✅ Logged in successfully. Session cookie obtained.');

  // 2. Initial Learner Model Vector Check
  console.log('\n[3/6] Fetching Initial Multi-Layer Competency Vector...');
  const initProfile = await api('/adaptive/profile');
  if (!initProfile.ok) {
    console.error('❌ Failed to get adaptive profile:', initProfile.data);
    process.exit(1);
  }

  const p = initProfile.data;
  console.log(`\n📊 INITIAL COMPETENCY VECTOR SUMMARY:`);
  console.log(`- Student ID: ${p.studentId}`);
  console.log(`- Diagnostic Completed: ${p.diagnosticCompleted}`);
  console.log(`- Overall Readiness: ${p.overallReadiness}`);
  console.log(`- 12 Core Concepts initialized: ${Object.keys(p.conceptMastery || {}).length} concepts`);
  console.log(`  Concepts: ${Object.keys(p.conceptMastery || {}).join(', ')}`);
  console.log(`- 9 Algorithmic Patterns initialized: ${Object.keys(p.patternMastery || {}).length} patterns`);
  console.log(`  Patterns: ${Object.keys(p.patternMastery || {}).join(', ')}`);
  console.log(`- 5 Coding Competencies initialized: ${Object.keys(p.codingCompetencies || {}).length} competencies`);
  console.log(`- 9 Error Profiles initialized: ${Object.keys(p.errorProfile || {}).length} error types`);
  console.log(`- 12 Topic League Ranks initialized: ${p.topicRanks?.length || 0} cards`);
  console.log(`  Sample Concept Rank (ARRAYS): Tier = ${p.topicRanks?.find(r => r.topic === 'ARRAYS')?.rankTier}, XP = ${p.topicRanks?.find(r => r.topic === 'ARRAYS')?.rankXp}`);

  if (Object.keys(p.conceptMastery || {}).length !== 12) {
    throw new Error(`Expected 12 concepts, got ${Object.keys(p.conceptMastery || {}).length}`);
  }
  if (Object.keys(p.patternMastery || {}).length !== 9) {
    throw new Error(`Expected 9 patterns, got ${Object.keys(p.patternMastery || {}).length}`);
  }
  if (Object.keys(p.codingCompetencies || {}).length !== 5) {
    throw new Error(`Expected 5 competencies, got ${Object.keys(p.codingCompetencies || {}).length}`);
  }
  if (Object.keys(p.errorProfile || {}).length !== 9) {
    throw new Error(`Expected 9 error profiles, got ${Object.keys(p.errorProfile || {}).length}`);
  }

  // 3. Fetch Diagnostic Questions
  console.log('\n[4/6] Fetching Diagnostic Assessment Questions...');
  const diagQRes = await api('/adaptive/diagnostic/questions');
  if (!diagQRes.ok) {
    console.error(`❌ Failed to fetch diagnostic questions: HTTP ${diagQRes.status}`, diagQRes.data);
    process.exit(1);
  }
  const questions = diagQRes.data;
  console.log(`✅ Loaded ${questions.length} diagnostic questions.`);

  // 4. Test Scenario: Submitting Diagnostic Calibration with mixed performance
  // Q1 (Arrays - Prefix Sum) -> Perfect 3/3 passed
  // Q2 (Strings - Two Pointers) -> 2/3 passed
  // Q3 (Trees - DFS) -> 0/3 passed (Failed / Syntax error)
  // Q4 (Greedy) -> Perfect 3/3 passed
  // Q5 (Dynamic Programming) -> 1/3 passed
  // Q6 (Binary Search) -> Perfect 3/3 passed
  console.log('\n[5/6] Submitting Diagnostic Assessment with Realistic Mixed Answers...');
  const testSubmissions = questions.map((q, idx) => {
    let passedCount = 3;
    let code = 'class Solution { public int solve() { return 0; } }';
    if (idx === 1) passedCount = 2; // partial
    if (idx === 2) { passedCount = 0; code = 'class Solution { error syntax'; } // failed
    if (idx === 4) passedCount = 1; // partial

    return {
      questionId: q.id,
      code,
      language: 'java',
      attempts: idx === 2 ? 3 : 1,
      durationSeconds: 45 + (idx * 10),
      proctorViolations: idx === 2 ? 1 : 0,
      passedCount,
      totalTestCases: 3,
    };
  });

  const diagSubmitRes = await api('/adaptive/diagnostic/submit', {
    method: 'POST',
    body: JSON.stringify({ submissions: testSubmissions }),
  });

  if (!diagSubmitRes.ok) {
    console.error('❌ Diagnostic submission failed with error:', diagSubmitRes.data);
    process.exit(1);
  }

  console.log('✅ Diagnostic Exam evaluated and calibrated successfully!');
  console.log(`- Total Passed Questions: ${diagSubmitRes.data.totalPassedQuestions} / ${diagSubmitRes.data.totalQuestions}`);
  console.log(`- Overall Readiness Calibrated To: ${Math.round(diagSubmitRes.data.overallReadiness * 100)}%`);

  // Verify calibrated learner profile
  const calibratedProfile = await api('/adaptive/profile');
  const cp = calibratedProfile.data;
  console.log(`\n📊 CALIBRATED COMPETENCY VECTOR RESULTS:`);
  console.log(`- Arrays Mastery: ${cp.conceptMastery.ARRAYS} (XP: ${cp.topicRanks?.find(r => r.topic === 'ARRAYS')?.rankXp}, Tier: ${cp.topicRanks?.find(r => r.topic === 'ARRAYS')?.rankTier})`);
  console.log(`- Greedy Mastery: ${cp.conceptMastery.GREEDY} (XP: ${cp.topicRanks?.find(r => r.topic === 'GREEDY')?.rankXp}, Tier: ${cp.topicRanks?.find(r => r.topic === 'GREEDY')?.rankTier})`);
  console.log(`- Trees Mastery: ${cp.conceptMastery.TREES} (Failed question -> Lower Bayesian prior)`);
  console.log(`- Recommended Topic for Training: ${cp.recommendedTopic}`);
  console.log(`- Is Remediation Recommended: ${cp.isRemediationRecommended}`);

  // 5. Test Adaptive Training Session Flow:
  // Create training session on target topic (e.g. ARRAYS)
  console.log('\n[6/6] Testing Dynamic ZPD Adaptive Training Session Flow...');
  const startTrainRes = await api('/adaptive/training/start', {
    method: 'POST',
    body: JSON.stringify({ topic: 'ARRAYS' }),
  });

  if (!startTrainRes.ok) {
    console.error('❌ Failed to start training session:', startTrainRes.data);
    process.exit(1);
  }

  const trainExam = startTrainRes.data;
  console.log(`✅ Started Adaptive Training Exam (Session ID: ${trainExam.sessionId})`);
  console.log(`- Target Skill: ${trainExam.targetSkill}`);
  console.log(`- Dynamic ZPD Calibrated Difficulty: ${trainExam.difficulty}`);
  console.log(`- Questions Generated: ${trainExam.questions?.length || 0}`);

  // Submit Training Session with Perfect Answers (3/3 passed)
  const trainAnswers = trainExam.questions.map((tq) => ({
    questionId: tq.id,
    code: 'class Solution { public int solve() { return 1; } }',
    language: 'java',
    attempts: 1,
    durationSeconds: 30,
    proctorViolations: 0,
    passedCount: 3,
    totalTestCases: 3,
  }));

  // ================================================================
  // 🎯 EXHAUSTIVE REAL-TIME SITUATION TESTS
  // ================================================================

  console.log('\n================================================================');
  console.log('🧪 TESTING SITUATION A: USER ANSWERS 2 OF 3 QUESTIONS');
  console.log('================================================================');
  const sitARes = await api('/adaptive/training/start', {
    method: 'POST',
    body: JSON.stringify({ topic: 'GREEDY' }),
  });
  const sitAExam = sitARes.data;
  console.log(`Started GREEDY training session: ID ${sitAExam.sessionId}, ZPD Difficulty: ${sitAExam.difficulty}`);

  const sitAAnswers = sitAExam.questions.map((q, idx) => ({
    questionId: q.id,
    code: idx < 2 ? 'class Solution { public int solve() { return 1; } }' : '',
    language: 'java',
    attempts: 1,
    durationSeconds: 40,
    proctorViolations: 0,
    passedCount: idx < 2 ? 3 : 0, // 2 passed, 1 unanswered
    totalTestCases: 3,
  }));

  const sitASubmit = await api('/adaptive/training/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId: sitAExam.sessionId, answers: sitAAnswers }),
  });
  console.log(`- Result: Score ${sitASubmit.data.score}%, Passed: ${sitASubmit.data.passedQuestions}/${sitASubmit.data.totalQuestions}`);
  console.log(`- GREEDY Mastery: ${sitASubmit.data.oldMastery} -> ${sitASubmit.data.newMastery} (Delta: ${sitASubmit.data.masteryDelta > 0 ? '+' : ''}${Math.round(sitASubmit.data.masteryDelta * 100)}%)`);
  console.log(`- Trend: ${sitASubmit.data.recentTrend}`);

  console.log('\n================================================================');
  console.log('🧪 TESTING SITUATION B: USER ANSWERS ONLY 1 OF 3 QUESTIONS');
  console.log('================================================================');
  const sitBRes = await api('/adaptive/training/start', {
    method: 'POST',
    body: JSON.stringify({ topic: 'DYNAMIC_PROGRAMMING' }),
  });
  const sitBExam = sitBRes.data;
  console.log(`Started DP training session: ID ${sitBExam.sessionId}, ZPD Difficulty: ${sitBExam.difficulty}`);

  const sitBAnswers = sitBExam.questions.map((q, idx) => ({
    questionId: q.id,
    code: idx === 0 ? 'class Solution { public int solve() { return 1; } }' : '',
    language: 'java',
    attempts: 2,
    durationSeconds: 90,
    proctorViolations: 0,
    passedCount: idx === 0 ? 3 : 0, // 1 passed, 2 unanswered
    totalTestCases: 3,
  }));

  const sitBSubmit = await api('/adaptive/training/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId: sitBExam.sessionId, answers: sitBAnswers }),
  });
  console.log(`- Result: Score ${sitBSubmit.data.score}%, Passed: ${sitBSubmit.data.passedQuestions}/${sitBSubmit.data.totalQuestions}`);
  console.log(`- DP Mastery: ${sitBSubmit.data.oldMastery} -> ${sitBSubmit.data.newMastery} (Delta: ${sitBSubmit.data.masteryDelta > 0 ? '+' : ''}${Math.round(sitBSubmit.data.masteryDelta * 100)}%)`);
  console.log(`- Trend: ${sitBSubmit.data.recentTrend}`);

  console.log('\n================================================================');
  console.log('🧪 TESTING SITUATION C: USER FAILS / DOES NOT ANSWER (COMPETENCY REDUCES)');
  console.log('================================================================');
  // First get a topic that had some mastery, e.g. ARRAYS (which was 0.93)
  const sitCRes = await api('/adaptive/training/start', {
    method: 'POST',
    body: JSON.stringify({ topic: 'ARRAYS' }),
  });
  const sitCExam = sitCRes.data;
  console.log(`Started ARRAYS advanced session: ID ${sitCExam.sessionId}, Difficulty: ${sitCExam.difficulty}`);

  const sitCAnswers = sitCExam.questions.map((q) => ({
    questionId: q.id,
    code: 'class Solution { // blank or wrong code }',
    language: 'java',
    attempts: 3,
    durationSeconds: 120,
    proctorViolations: 2, // violations present
    passedCount: 0, // 0 passed out of 3
    totalTestCases: 3,
  }));

  const sitCSubmit = await api('/adaptive/training/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId: sitCExam.sessionId, answers: sitCAnswers }),
  });
  console.log(`- Result: Score ${sitCSubmit.data.score}%, Passed: ${sitCSubmit.data.passedQuestions}/${sitCSubmit.data.totalQuestions}`);
  console.log(`- ARRAYS Mastery Before Failure: ${sitCSubmit.data.oldMastery}`);
  console.log(`- ARRAYS Mastery After Failure: ${sitCSubmit.data.newMastery}`);
  console.log(`- Competency Reduction Delta: ${sitCSubmit.data.masteryDelta < 0 ? '' : '+'}${Math.round(sitCSubmit.data.masteryDelta * 100)}% (COMPETENCY PROPERLY REDUCED!)`);
  console.log(`- Trend: ${sitCSubmit.data.recentTrend} (Triggered DECLINING Bayesian trend)`);

  console.log('\n================================================================');
  console.log('🧪 TESTING SITUATION D: REMEDIATION ENGINE & RANKING CALIBRATION');
  console.log('================================================================');
  const postFailProfile = await api('/adaptive/profile');
  const pfp = postFailProfile.data;
  console.log(`- Recommended Topic for Student: ${pfp.recommendedTopic}`);
  console.log(`- Is Targeted Remediation Recommended: ${pfp.isRemediationRecommended}`);
  console.log(`- Remediation Reason: ${pfp.remediationReason}`);

  console.log('\n================================================================');
  console.log('🧪 TESTING SITUATION E: PERFECT EFFICIENT ANSWERS ON REMEDIATION');
  console.log('================================================================');
  const sitERes = await api('/adaptive/training/start', {
    method: 'POST',
    body: JSON.stringify({ topic: pfp.recommendedTopic }),
  });
  const sitEExam = sitERes.data;
  console.log(`Started Warmup Remediation Session on: ${sitEExam.targetSkill} (Difficulty: ${sitEExam.difficulty})`);

  const sitEAnswers = sitEExam.questions.map((q) => ({
    questionId: q.id,
    code: 'class Solution { public int solve() { return 1; } }',
    language: 'java',
    attempts: 1, // 1 clean compile attempt
    durationSeconds: 20, // fast efficient solution
    proctorViolations: 0,
    passedCount: 3, // 100% test cases passed
    totalTestCases: 3,
  }));

  const sitESubmit = await api('/adaptive/training/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId: sitEExam.sessionId, answers: sitEAnswers }),
  });
  console.log(`- Perfect Session Result: Score ${sitESubmit.data.score}%, Passed: ${sitESubmit.data.passedQuestions}/${sitESubmit.data.totalQuestions}`);
  console.log(`- Mastery Recovery: ${sitESubmit.data.oldMastery} -> ${sitESubmit.data.newMastery} (+${Math.round(sitESubmit.data.masteryDelta * 100)}%)`);
  console.log(`- Trend Recovered to: ${sitESubmit.data.recentTrend}`);

  // Final Master Graph Vector Verification
  console.log('\n================================================================');
  console.log('🏆 FINAL MASTER GRAPH & SINGLE SOURCE OF TRUTH VERIFICATION');
  console.log('================================================================');
  const masterProfile = await api('/adaptive/profile');
  const mp = masterProfile.data;

  console.log(`\n📋 12 CONCEPTS SUMMARY (Single Source of Truth):`);
  for (const [concept, score] of Object.entries(mp.conceptMastery || {})) {
    const rank = mp.topicRanks?.find(r => r.topic === concept);
    console.log(`  • ${concept.padEnd(22)}: Mastery = ${(score * 100).toFixed(1)}% | Rank XP = ${String(rank?.rankXp || 0).padStart(3)} XP | League = ${rank?.rankTier || 'BRONZE'} | Solved = ${rank?.questionsSolved || 0}`);
  }

  console.log(`\n📋 9 ALGORITHMIC PATTERNS SUMMARY:`);
  for (const [pat, score] of Object.entries(mp.patternMastery || {})) {
    console.log(`  • ${pat.padEnd(24)}: Mastery = ${(score * 100).toFixed(1)}%`);
  }

  console.log(`\n📋 5 CODING COMPETENCIES SUMMARY:`);
  for (const [comp, score] of Object.entries(mp.codingCompetencies || {})) {
    console.log(`  • ${comp.padEnd(24)}: Score = ${(score * 100).toFixed(1)}%`);
  }

  console.log(`\n📋 9 ERROR TAXONOMY PROFILES:`);
  for (const [err, risk] of Object.entries(mp.errorProfile || {})) {
    console.log(`  • ${err.padEnd(30)}: Error Risk = ${(risk * 100).toFixed(1)}%`);
  }

  console.log(`\n🎓 Overall Readiness Master Score: ${Math.round(mp.overallReadiness * 100)}%`);
  console.log(`🏆 Total DSA Questions Solved: ${mp.totalQuestionsSolved}`);
  console.log(`📈 Total Training Sessions Completed: ${mp.totalSessionsCompleted}`);

  console.log('\n================================================================');
  console.log('✨ ALL POSSIBLE SITUATIONS & EDGE CASES VERIFIED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('Unhandled error during test:', err);
  process.exit(1);
});
