package repository

import (
	"context"
	"database/sql"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type AIPendingJobRepository struct {
	db *sql.DB
}

func NewAIPendingJobRepository(db *sql.DB) *AIPendingJobRepository {
	return &AIPendingJobRepository{db: db}
}

func (r *AIPendingJobRepository) Enqueue(ctx context.Context, wordID, wordText, wordContext, jobType string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ai_pending_jobs (word_id, word_text, word_context, job_type)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (word_id, job_type) DO NOTHING
	`, wordID, wordText, wordContext, jobType)
	return err
}

func (r *AIPendingJobRepository) FetchDue(ctx context.Context, limit int) ([]domain.AIPendingJob, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, word_id, word_text, word_context, job_type, status,
		       attempts, max_attempts, next_retry_at, last_error, created_at
		FROM ai_pending_jobs
		WHERE status = 'pending' AND next_retry_at <= now()
		ORDER BY next_retry_at
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []domain.AIPendingJob
	for rows.Next() {
		var j domain.AIPendingJob
		if err := rows.Scan(
			&j.ID, &j.WordID, &j.WordText, &j.WordContext, &j.JobType, &j.Status,
			&j.Attempts, &j.MaxAttempts, &j.NextRetryAt, &j.LastError, &j.CreatedAt,
		); err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}

func (r *AIPendingJobRepository) MarkDone(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE ai_pending_jobs SET status = 'done' WHERE id = $1`, id)
	return err
}

// RecordAttempt increments the attempt counter and schedules the next retry with
// exponential backoff (2^attempts minutes). Marks the job as 'failed' permanently
// once max_attempts is reached.
func (r *AIPendingJobRepository) RecordAttempt(ctx context.Context, id string, errMsg string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE ai_pending_jobs
		SET attempts      = attempts + 1,
		    last_error    = $2,
		    next_retry_at = CASE
		        WHEN attempts + 1 >= max_attempts THEN next_retry_at
		        ELSE now() + (POWER(2, attempts) * INTERVAL '1 minute')
		    END,
		    status = CASE
		        WHEN attempts + 1 >= max_attempts THEN 'failed'
		        ELSE 'pending'
		    END
		WHERE id = $1
	`, id, errMsg)
	return err
}
