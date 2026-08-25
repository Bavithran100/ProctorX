-- Run once against the production MySQL database after taking a backup.
-- Hibernate ddl-auto=update does not reliably expand existing MySQL ENUM columns.

ALTER TABLE exam_sessions
    MODIFY COLUMN status ENUM('ACTIVE', 'WAITING', 'LOCKED', 'TERMINATED', 'SUBMITTED') NOT NULL;

ALTER TABLE admin_actions
    MODIFY COLUMN action ENUM('WARN', 'WAITING', 'NORMAL', 'LOCK', 'TERMINATE') NOT NULL;

ALTER TABLE malpractice_logs
    MODIFY COLUMN event_type ENUM(
        'TAB_SWITCH', 'WINDOW_BLUR', 'PAGE_REFRESH', 'COPY', 'PASTE', 'RIGHT_CLICK',
        'MULTIPLE_PERSON', 'MOBILE_PHONE', 'CAMERA_UNAVAILABLE', 'FULLSCREEN_EXIT'
    ) NOT NULL;

ALTER TABLE malpractice_logs
    ADD COLUMN IF NOT EXISTS occurrence_count INT NOT NULL DEFAULT 1;
