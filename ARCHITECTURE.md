# ProctorX modular monorepo

The repository contains two deployable applications:

- `proctorXfrontend`: Vite/React application organized into `app`, `shared`, and `features`.
- `ProctorXbackend`: Spring Boot modular monolith organized under `modules` and `shared`.

The backend source locations are domain-oriented while the existing
`com.example.ProctorX.*` Java package names remain intentionally unchanged in
this compatibility migration. This preserves Spring component discovery,
entity names, REST endpoints, serialized responses, and database mappings.

## Backend domains

- `auth` and `user`: authentication, OAuth, and users
- `exam` and `question`: authoring and exam availability
- `submission`: answers, submissions, and results
- `coding`: coding questions, test cases, and execution adapter
- `proctoring`: sessions, malpractice, and coordinator actions
- `analytics`: monitoring and audit queries
- `ai`, `learning`, and `contest`: reserved domain boundaries for future work

No REST path, database table, cookie contract, or API payload is intentionally
changed by this structural migration.
