# 🎓 ProctorX – AI-Powered Online Examination and Intelligent Proctoring System

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/SpringBoot-3.x-green)
![React](https://img.shields.io/badge/React-Vite-blue)
![MySQL](https://img.shields.io/badge/MySQL-Database-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## 📖 Overview

**ProctorX** is an AI-powered online examination platform designed to provide secure, intelligent, and automated assessments. The system combines a modern web-based examination platform with Artificial Intelligence to assist educators in generating high-quality examinations while monitoring students during live examinations.

Unlike traditional examination systems, ProctorX integrates a **Multi-Agent AI architecture** for automatic exam creation and an **AI-assisted proctoring system** that detects suspicious activities during examinations.

The platform allows administrators to create exams, generate AI-based questions, conduct secure online examinations, monitor students in real time, and automatically evaluate coding questions.

---

# 🚀 Key Features

## 👨‍🏫 Administrator Module

- Administrator Authentication
- Coordinator Approval System
- Exam Management
- Live Examination Monitoring
- Student Management
- AI-based Question Generation
- Coding Question Management
- Automatic Test Case Generation
- Result Management
- Malpractice Monitoring Dashboard

---

## 👨‍🎓 Student Module

- Secure Login
- Today's Exams
- Upcoming Exams
- Start Examination
- Live Coding Environment
- Automatic Submission
- Result Viewing
- Session-based Authentication

---

# 🤖 Multi-Agent AI System

ProctorX uses three specialized AI agents to automate examination creation.

---

## 🧠 Agent 1 — ProctorX Planner

### Responsibility

The Planner Agent analyzes the coordinator's requirements and creates a structured examination blueprint.

### Responsibilities

- Analyze user requirements
- Understand examination topics
- Plan question distribution
- Plan difficulty levels
- Determine coding language
- Decide examination duration
- Prepare structured planning output

---

## ✨ Agent 2 — ProctorX QuestionForge

### Responsibility

Generates examination questions based on the planner's blueprint.

### Supports

- Multiple Choice Questions
- Coding Questions
- Marks Allocation
- Difficulty Assignment
- Java Reference Solutions

---

## ✅ Agent 3 — ProctorX AnswerGuard

### Responsibility

Validates generated coding solutions and prepares evaluation data.

### Features

- Java Code Validation
- Expected Output Generation
- Coding Test Case Generation
- Automatic Answer Key Generation
- Compilation Verification

---

# 🎥 Intelligent Online Proctoring

During live examinations, ProctorX continuously monitors student activities.

Current implemented features include:

- Tab Switch Detection
- Window Blur Detection
- Right Click Restriction
- Session Monitoring
- Automatic Exam Submission
- Force Logout Support

---

## 🚧 Upcoming AI Proctoring Features

Future versions of ProctorX will include:

- Fullscreen Enforcement
- YOLO-based Person Detection
- Mobile Phone Detection
- Multiple Person Detection
- Book Detection
- Face Presence Detection
- Head Pose Detection
- Risk Score Calculation
- Live Evidence Capture
- AI-assisted Malpractice Reports

---

# 💻 Coding Examination Module

The coding assessment module provides:

- Monaco Code Editor
- Java Programming Support
- Automatic Compilation
- Expected Output Generation
- Multiple Test Cases
- Automatic Evaluation
- Reference Solution Validation

---

# 🏗️ System Architecture

```
                    React Frontend
                          │
                          ▼
                  Spring Boot Backend
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
      MySQL DB      AI Agents        Code Execution
                          │
              ┌───────────┼────────────┐
              ▼           ▼            ▼
        Planner     QuestionForge   AnswerGuard
```

---

# 🛠️ Technology Stack

## Frontend

- React.js
- Vite
- React Router
- Axios
- Monaco Editor
- CSS

---

## Backend

- Spring Boot
- Spring Security
- Spring Data JPA
- REST APIs
- Session Authentication

---

## Database

- MySQL

---

## AI Services

- Groq API
- LLaMA 3.1
- Multi-Agent AI Architecture

---

## Future AI

- YOLO Object Detection
- MediaPipe Face Detection

---

# 🔐 Security Features

- Session-Based Authentication
- Role-Based Authorization
- Secure Cookies
- Protected REST APIs
- Coordinator Approval Workflow
- Automatic Session Management

---

# 📂 Project Modules

```
Admin Module
│
├── Dashboard
├── Exam Management
├── Question Management
├── AI Question Generation
├── Live Monitoring
└── Results

Student Module
│
├── Dashboard
├── Today's Exams
├── Coding Exams
├── Results
└── Profile

AI Module
│
├── Planner Agent
├── QuestionForge
└── AnswerGuard

Backend
│
├── Authentication
├── Session Management
├── Exam APIs
├── Question APIs
├── Coding APIs
└── AI APIs
```

---

# 📈 Workflow

```
Coordinator
      │
      ▼
Create Exam
      │
      ▼
AI Planner
      │
      ▼
QuestionForge
      │
      ▼
AnswerGuard
      │
      ▼
Exam Published
      │
      ▼
Student Starts Exam
      │
      ▼
Live Monitoring
      │
      ▼
Automatic Evaluation
      │
      ▼
Results
```

---

# 🌟 Future Enhancements

- YOLO-based Live Object Detection
- Face Recognition
- AI Risk Score Engine
- Audio Monitoring
- AI-based Malpractice Report Generation
- Multi-language Coding Support
- Cloud Deployment
- Real-time Notifications

---

# 👨‍💻 Developed By

**Bavithran Natarajan**

ECE Undergraduate  
Full Stack Developer  
Spring Boot Developer  
AI & System Design Enthusiast

---

# 🌐 Live Demo

**Frontend:**  
`https://proctor-x-frontend.vercel.app/`

---

# ⚙️ Backend Repository

`https://github.com/Bavithran100/ProctorXBackend.git`

---

# 💻 Frontend Repository

`https://github.com/Bavithran100/ProctorXFrontend.git`

---

# 📜 License

This project is developed for academic and research purposes.
