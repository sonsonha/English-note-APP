package domain

import (
	"context"
	"time"
)

const (
	AIJobTypeExplainWord       = "explain_word"
	AIJobTypeGenerateQuizzes   = "generate_quizzes"
	AIJobTypeBackfillVIMeaning    = "backfill_vi_meaning"
	AIJobTypeBackfillTopic        = "backfill_topic"
	AIJobTypeBackfillPronunciation = "backfill_pronunciation"

	AIJobStatusPending = "pending"
	AIJobStatusDone    = "done"
	AIJobStatusFailed  = "failed"
)

type AIPendingJob struct {
	ID          string
	WordID      string
	WordText    string
	WordContext string
	JobType     string
	Status      string
	Attempts    int
	MaxAttempts int
	NextRetryAt time.Time
	LastError   string
	CreatedAt   time.Time
}

type AIPendingJobRepository interface {
	Enqueue(ctx context.Context, wordID, wordText, wordContext, jobType string) error
	FetchDue(ctx context.Context, limit int) ([]AIPendingJob, error)
	MarkDone(ctx context.Context, id string) error
	RecordAttempt(ctx context.Context, id string, errMsg string) error
}
