# 🧠 AlgoCortex AI (ProctorX)
### An AI-Powered Adaptive Online Examination & Cognitive Assessment Platform
#### *With Edge Computer Vision Proctoring, In-Browser WebAssembly IDE, and 20-Dimensional Cognitive Matrix*

[![Live Demo](https://img.shields.io/badge/Live_Demo-proctor--x--1.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://proctor-x-1.vercel.app/)
[![Java Version](https://img.shields.io/badge/Java-24-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0.0-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)](https://webassembly.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📌 Table of Contents
- [Executive Summary](#-executive-summary)
- [System Architecture](#-system-architecture)
- [Core Engineering Innovations](#-core-engineering-innovations)
  - [1. 20-Dimensional Cognitive Learner Telemetry](#1-20-dimensional-cognitive-learner-telemetry)
  - [2. Psychometric Engines: Bayesian Knowledge Tracing (BKT) & IRT $\theta$](#2-psychometric-engines-bayesian-knowledge-tracing-bkt--irt-theta)
  - [3. Edge Computer Vision & Privacy-Preserving AI Proctoring](#3-edge-computer-vision--privacy-preserving-ai-proctoring)
  - [4. Zero-Latency In-Browser WebAssembly (WASM) Multi-Compiler IDE](#4-zero-latency-in-browser-webassembly-wasm-multi-compiler-ide)
  - [5. Bloom Filter Username Uniqueness Engine](#5-bloom-filter-username-uniqueness-engine)
  - [6. Same-Origin Vercel Reverse Proxy Architecture](#6-same-origin-vercel-reverse-proxy-architecture)
- [Platform Modules](#-platform-modules)
  - [Candidate Portal](#-candidate-portal)
  - [Coordinator & Administrator Control Room](#-coordinator--administrator-control-room)
  - [Diagnostic Cognitive AI Lab](#-diagnostic-cognitive-ai-lab)
- [Technology Stack](#-technology-stack)
- [Directory Structure](#-directory-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Environment Configuration](#-environment-configuration)
- [Security & Compliance](#-security--compliance)
- [Authors & Acknowledgments](#-authors--acknowledgments)

---

## 📖 Executive Summary

Traditional examination and coding assessment platforms (like LeetCode, HackerRank, and Proctorio) operate in disconnected silos: they either test algorithmic syntax without verifying candidate identity, or they impose heavy, privacy-invasive video surveillance without diagnosing cognitive learning gaps.

**AlgoCortex AI (ProctorX)** bridges this divide. It is a dual-purpose platform combining:
1. **Adaptive AI DSA & Algorithmic Training**: Calibrates challenges in real time to the student's exact **Zone of Proximal Development (ZPD)** across **35 cognitive dimensions** using **Bayesian Knowledge Tracing (BKT)** and **Item Response Theory (IRT)**.
2. **High-Integrity Edge AI Examination Supervision**: Executes real-time face tracking, gaze verification, and object detection locally in the candidate's browser via **isolated Web Workers and WebAssembly**, ensuring zero video transmission over the network and 100% privacy compliance.
3. **High-Performance In-Browser Execution**: Runs and grades multi-language code (Java, C++, Python, JavaScript) locally inside the client runtime, bypassing slow remote cloud compilation.

---

## 🏛 System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │            CANDIDATE / COORDINATOR           │
                                  │       https://proctor-x-1.vercel.app         │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                    Same-Origin Request  │ (Zero CORS Latency)
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │          VERCEL EDGE REVERSE PROXY           │
                                  │               (vercel.json)                  │
                                  │   Rewrites: /api/* -> Render Cloud Backend   │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                      Encrypted HTTP/2   │ Server-to-Server
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │             SPRING BOOT BACKEND              │
                                  │    (Render Cloud / Docker / Java 24 Core)    │
                                  └──────┬───────────────┬───────────────┬───────┘
                                         │               │               │
                 ┌───────────────────────┘               │               └───────────────────────┐
                 ▼                                       ▼                                       ▼
    ┌──────────────────────────┐           ┌──────────────────────────┐           ┌──────────────────────────┐
    │    BLOOM FILTER ENGINE   │           │    PSYCHOMETRIC CORE     │           │   GROQ AI SYNTHESIS LPU  │
    │  Guava Murmur3 Hashing   │           │   - BKT Knowledge Engine │           │ Real-Time Error-Injected │
    │  O(1) Username Lookup    │           │   - IRT Latent Theta (θ) │           │ Algorithmic Challenges   │
    │  0% False Negatives      │           │   - 20-D Matrix Telemetry│           │ Model: OSS-120B / Llama3 │
    └──────────────────────────┘           └──────────────────────────┘           └──────────────────────────┘
                 │                                       │                                       │
                 └───────────────────────┬───────────────┴───────────────────────────────────────┘
                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │          PERSISTENCE & CACHE TIER            │
                                  │  - PostgreSQL / MySQL (Relational DB)        │
                                  │  - Redis Cloud (Session Cache & Telemetry)   │
                                  └──────────────────────────────────────────────┘
```

---

## ⚡ Core Engineering Innovations

### 1. 20-Dimensional Cognitive Learner Telemetry
Instead of a single crude percentage grade, AlgoCortex AI maps candidate proficiency across an interconnected, multi-hop knowledge graph:
* **8 Core Concepts**: `ARRAYS_STRINGS`, `HASH_TABLES`, `LINKED_LISTS`, `STACKS_QUEUES`, `TREES_BST`, `GRAPHS`, `RECURSION_BACKTRACKING`, `DYNAMIC_PROGRAMMING`.
* **8 Reusable Algorithmic Patterns**: `TWO_POINTERS`, `SLIDING_WINDOW`, `BINARY_SEARCH`, `BFS_DFS`, `MONOTONIC_QUEUE_STACK`, `TOP_K_HEAP`, `UNION_FIND`, `INTERVALS_GREEDY`.
* **4 Engineering Telemetry Competencies**: `ALGORITHMIC_EFFICIENCY`, `EDGE_CASE_RESILIENCE`, `CODE_RELIABILITY`, `IMPLEMENTATION_FLUENCY`.
* **4 Core Diagnostic Defect Profiles**: `OFF_BY_ONE`, `NULL_EMPTY_COLLECTION`, `TIME_LIMIT_EXCEEDED`, `STATE_CORRUPTION`.

When a candidate fails a test case, the system ripples mastery updates across neighboring graph nodes (e.g. failing an `ARRAYS_STRINGS` problem with `OFF_BY_ONE` updates linked pattern `TWO_POINTERS` by 45% and parent prerequisite concepts via the Directed Acyclic Graph).

---

### 2. Psychometric Engines: Bayesian Knowledge Tracing (BKT) & IRT $\theta$

#### Bayesian Knowledge Tracing (BKT)
Tracks the hidden mastery state $L_t \in [0.10, 0.98]$ for each specific skill parameter:
$$\text{Posterior } P(L_t \mid \text{Evidence}) = \frac{P(L_{t-1}) \cdot \left[e \cdot (1 - P(S)) + (1 - e) \cdot P(S)\right]}{P(\text{Evidence})}$$
$$\text{Transition Update: } P(L_t) = P(L_t \mid \text{Evidence}) + \left(1 - P(L_t \mid \text{Evidence})\right) \cdot P(T)$$
* $P(T) = 0.12$ (Probability of learning transition).
* $P(S)$ dynamically scales with problem difficulty parameter $b$: $P(S) = \text{clamp}(0.06, 0.20, 0.09 + 0.03 \cdot b)$.
* $e$ represents effective evidence factoring test case pass ratio, retry attempts, duration, and proctoring penalties.

#### Item Response Theory (IRT)
Evaluates latent candidate ability $\theta \in [-3.0, +3.0]$ via the 2-Parameter Logistic (2PL) log-odds calibration:
$$\theta = \ln\left(\frac{P(L_t)}{1 - P(L_t)}\right)$$
Dynamically recalibrates the candidate's **Zone of Proximal Development (ZPD)** (`EASY`, `EASY_MEDIUM`, `MEDIUM`, `MEDIUM_HARD`, `HARD`, `ADVANCED_HARD`) and synthesizes targeted inoculation problems using the Groq LPU API.

---

### 3. Edge Computer Vision & Privacy-Preserving AI Proctoring
All optical surveillance runs **entirely on the client device** inside parallel Web Workers. No raw webcam footage is ever uploaded to servers, protecting candidate privacy and GDPR compliance.

* **YOLOv8 Object Detection (`yolo.worker.js`)**: Real-time identification of prohibited objects (cell phones, smart watches, books, extra monitors).
* **YuNet & MediaPipe Face Tracking (`face.worker.js`)**: Real-time facial landmark extraction, eye-gaze yaw/pitch deviation, multi-face presence detection, and candidate absence detection.
* **Tamper-Proof Multi-Tab Detection**: Uses the browser's native `BroadcastChannel` and Visibility APIs to detect split-screen windows, background tab switches, and unauthorized monitors.
* **Biometric Face Verification**: 128-dimensional cosine distance face embeddings match the live examinee against their verified profile photograph.

---

### 4. Zero-Latency In-Browser WebAssembly (WASM) Multi-Compiler IDE
Eliminates expensive, vulnerable cloud container execution by running multi-language compilers directly inside the candidate's browser sandbox:
* **Java**: Custom in-browser parser with AST transpiler and polyfilled Java Assessment Standard Library (`Scanner`, `System.out`, `Arrays`, `ArrayList`, `HashSet`, `HashMap`, `Collections`).
* **Python 3.11**: WebAssembly Pyodide execution runtime.
* **C / C++**: WebAssembly clang toolchain with zero network execution delay.
* **Watchdog Sandbox**: Strict 5000ms worker termination watchdog timer to defend against infinite loops, memory leaks, and Time Limit Exceeded (TLE) attacks.

---

### 5. Bloom Filter Username Uniqueness Engine
Protects authentication infrastructure against costly database table scans during real-time handle checks.
* **Google Guava Murmur3 Hashing**: Sized for 500,000 usernames with a 1% ($\epsilon = 0.01$) false-positive probability.
* **Tier 1 (RAM)**: Fast $O(1)$ in-memory check. If the Bloom Filter returns `false`, the username is **100% guaranteed available** with **zero database queries**.
* **Tier 2 (DB Fallback)**: If the Bloom Filter indicates a match, the database verifies to eliminate the 1% collision.
* **Integrity Guarantee**: Rejects conflicts with **HTTP 409 Conflict** (`USERNAME_TAKEN`), completely eliminating silent auto-renaming.

---

### 6. Same-Origin Vercel Reverse Proxy Architecture
Solves modern cross-domain security issues by proxying `/api/*` and `/oauth2/*` from Vercel (`https://proctor-x-1.vercel.app`) directly to Render:
* **First-Party Cookies**: Cookies are set with `SameSite=Lax; Secure; HttpOnly`.
* **Immune to Safari ITP & Chrome CHIPS**: Apple's Intelligent Tracking Prevention and Chrome's third-party cookie restrictions will never drop candidate session credentials.
* **Zero CORS Latency**: Eliminates repetitive cross-origin `OPTIONS` preflight round-trips.

---

## 📦 Platform Modules

### 👨‍🎓 Candidate Portal
* **Dashboard & Exam Roster**: View active examinations, upcoming institutional tests, and completed benchmarks.
* **Exam Security Gate**: Multi-stage hardware verification (webcam, microphone, screen share, single-screen lock).
* **Monaco Coding Environment**: Professional VS Code-grade code editor with syntax highlighting, keybindings, and inline test execution.
* **Public Verified Portfolio (`/u/:username`)**: LeetCode-style public profile showcasing verified rank tier (Bronze to Obsidian), 20-D competency radar, and exam achievements.

### 👨‍🏫 Coordinator & Administrator Control Room
* **Live Examination Monitor**: Real-time telemetry monitoring grid refreshing candidate status, active questions, face-detection alerts, and malpractice scores.
* **AI Question Generation Suite**: Multi-agent question planning based on learning objectives, test cases, and difficulty constraints.
* **Approval Workflow**: Granular authorization gate for students and coordinators.

### 🔬 Diagnostic Cognitive AI Lab (`/adaptive-lab`)
* **Vector Engine Sandbox**: Real-time playground to simulate BKT mastery shifts, IRT $\theta$ movements, and 20-D knowledge graph updates.
* **AI Reference Solution & Bug Injector**: Synthesizes verified optimal solutions and intentionally injects 4 classes of code defects for diagnostic evaluations.
* **Closed-Loop Chaining**: Feed resulting cognitive vectors directly into subsequent question generation rounds.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite (Rolldown), React Router v6, Redux Toolkit |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Edge AI & Computer Vision** | ONNX Runtime Web, YOLOv8, YuNet Face Detector, Web Workers |
| **In-Browser Runtimes** | WebAssembly (WASM), Pyodide Python 3.11, AST Java Runner |
| **Backend Framework** | Spring Boot 4.0.0, Java 24 (OpenJDK), Spring Security 6 |
| **Psychometrics & Telemetry** | Bayesian Knowledge Tracing (BKT), 2PL Item Response Theory (IRT) |
| **Hashing & Data Structures** | Google Guava (Bloom Filter with Murmur3 Hashing) |
| **Persistence & Caching** | PostgreSQL / MySQL (JPA / Hibernate), Redis Cloud |
| **AI LLM Inference** | Groq LPU Inference Cloud (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`) |
| **Infrastructure & Hosting** | Vercel (Edge Reverse Proxy & Frontend), Render (Cloud Compute) |

---

## 📁 Directory Structure

```text
OnlineExaminationProctorX/
├── ProctorXbackend/                      # Spring Boot Java 24 Core Backend
│   ├── build.gradle                      # Gradle Build Script (Guava, Spring, Redis)
│   ├── src/main/java/com/example/ProctorX/
│   │   ├── modules/
│   │   │   ├── adaptive/                 # 20-D Telemetry, BKT & IRT Engines
│   │   │   │   ├── application/          # AdaptiveEngineService.java
│   │   │   │   ├── domain/               # LearnerModel, SkillMastery, Vectors
│   │   │   │   └── web/                  # AdaptiveTesterController.java
│   │   │   ├── auth/                     # Authentication & Bloom Filter
│   │   │   │   ├── application/          # UsernameBloomFilterService.java
│   │   │   │   └── web/                  # AuthController.java
│   │   │   ├── exam/                     # Exam Sessions & Evaluation
│   │   │   └── user/                     # User Profiles & Biometrics
│   │   └── shared/config/                # SecurityConfig, RedisCache, Cors
│   └── src/main/resources/
│       └── application.properties        # Backend Server Configurations
│
├── proctorXfrontend/                     # React 18 + Vite Web Application
│   ├── index.html                        # SEO Meta, Schema.org LD-JSON, Favicon
│   ├── vercel.json                       # Vercel Edge Reverse Proxy Rewrites
│   ├── public/
│   │   ├── favicon.svg                   # Vector SVG App Favicon
│   │   ├── favicon-48x48.png             # Googlebot-Image Verified Favicon
│   │   ├── logo.png                      # High-Resolution Brand Logo
│   │   ├── robots.txt                    # Search Engine Crawler Directives
│   │   ├── sitemap.xml                   # XML Sitemap with Live Vercel URLs
│   │   └── workers/                      # WebAssembly & Web Workers
│   │       ├── java-runner.worker.js     # Sandboxed Java WASM Worker
│   │       ├── python-runner.worker.js   # Pyodide WASM Worker
│   │       └── cpp-runner.worker.js      # C/C++ WASM Worker
│   └── src/
│       ├── features/
│       │   ├── adaptive/                 # AdaptiveCoach, AdaptiveTester (AI Lab)
│       │   ├── exam/                     # CodingExam, AddQuestions, IDE
│       │   ├── proctoring/               # ProctoringOverlay, YOLO, YuNet
│       │   ├── profile/                  # PublicProfile, Skill Radar
│       │   └── workspace/                # Landing, Login, Register, Dashboard
│       └── shared/
│           ├── api/Client.jsx            # Axios Client with Auto-Proxy BaseURL
│           └── hooks/usePageMeta.jsx     # Dynamic Document Metadata Hook
└── README.md                             # Project Documentation
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
* **Java Development Kit (JDK)**: Java 21 or Java 24 installed.
* **Node.js**: v18.0.0 or higher with `npm`.
* **Database**: MySQL or PostgreSQL running locally or in cloud.
* **Redis**: Local Redis server or Redis Cloud instance.
* **Groq API Key**: (Optional, for real-time question synthesis) Get from [Groq Console](https://console.groq.com).

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/OnlineExaminationProctorX.git
cd OnlineExaminationProctorX
```

---

### Step 2: Configure & Launch Backend
1. Open `ProctorXbackend/src/main/resources/application.properties` (or set environment variables):
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/proctorx?useSSL=false&allowPublicKeyRetrieval=true
   spring.datasource.username=root
   spring.datasource.password=your_password
   spring.jpa.hibernate.ddl-auto=update

   spring.data.redis.host=localhost
   spring.data.redis.port=6379

   ai.groq.api-key=your_groq_api_key_here
   ```
2. Build and start the Spring Boot application:
   ```bash
   cd ProctorXbackend
   ./gradlew bootRun
   ```
   *The backend will boot up at `http://localhost:9080` and log the Bloom Filter initialization.*

---

### Step 3: Configure & Launch Frontend
1. Open a new terminal in the frontend directory:
   ```bash
   cd proctorXfrontend
   npm install
   ```
2. Verify `.env` file for local development:
   ```env
   VITE_API_BASE_URL=http://localhost:9080/api
   VITE_FRONTEND_URL=http://localhost:5173
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web app at `http://localhost:5173`.

---

## 🔒 Security & Compliance

* **Tamper-Proof Proctoring**: Video and audio frames are processed inside ephemeral memory and discarded immediately after classification. No video is uploaded to cloud storage.
* **Host-Only Session Cookies**: Session tokens utilize `HttpOnly; Secure; SameSite=Lax`, rendering them inaccessible to client-side XSS attacks.
* **CORS & CSRF Defense**: Enforces strict JSON payload boundaries, rejecting unauthorized cross-site form submissions.
* **Watchdog Sandbox Isolation**: Code executions are capped at 5000ms inside separate Web Workers to prevent memory leaks and infinite loop denial-of-service.

---

## 📄 License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for full details.

---

<p align="center">
  <b>Built with ❤️ by the AlgoCortex AI (ProctorX) Engineering Team</b><br/>
  <i>Pioneering the Future of Cognitive Algorithmic Education & High-Integrity Assessments</i>
</p>

