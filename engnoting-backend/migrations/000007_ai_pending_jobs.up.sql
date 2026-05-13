CREATE TABLE ai_pending_jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_id      UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    word_text    TEXT NOT NULL,
    word_context TEXT NOT NULL DEFAULT '',
    job_type     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    attempts     INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMP NOT NULL DEFAULT now(),
    last_error   TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (word_id, job_type)
);

CREATE INDEX idx_ai_pending_jobs_due ON ai_pending_jobs(next_retry_at)
    WHERE status = 'pending';
