package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type txContextKey string

const txKey txContextKey = "tx"

// execContexter is satisfied by both *sql.DB and *sql.Tx.
type execContexter interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

const updateStatsSQL = `
INSERT INTO review_stats (
	word_id,
	total_reviews,
	correct_reviews,
	last_reviewed_at,
	accuracy_rate
)
VALUES (
	$1,
	1,
	CASE WHEN $2 = true THEN 1 ELSE 0 END,
	now(),
	CASE WHEN $2 = true THEN 1.0 ELSE 0.0 END
)
ON CONFLICT (word_id)
DO UPDATE SET
	total_reviews = review_stats.total_reviews + 1,
	correct_reviews =
		review_stats.correct_reviews
		+ CASE WHEN $2 = true THEN 1 ELSE 0 END,
	last_reviewed_at = now(),
	accuracy_rate =
		(review_stats.correct_reviews
		 + CASE WHEN $2 = true THEN 1 ELSE 0 END)::float
		/ (review_stats.total_reviews + 1)
`

// ReviewRepository implements domain.ReviewRepository using PostgreSQL
type ReviewRepository struct {
	db *sql.DB
}

// NewReviewRepository creates a new ReviewRepository
func NewReviewRepository(db *sql.DB) *ReviewRepository {
	return &ReviewRepository{db: db}
}

// Create creates a new review within a transaction
func (r *ReviewRepository) Create(ctx context.Context, review *domain.Review) error {
	tx, ok := ctx.Value(txKey).(*sql.Tx)
	if !ok {
		// If no transaction, start one
		var err error
		tx, err = r.db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		defer tx.Rollback()

		ctxWithTx := context.WithValue(ctx, txKey, tx)

		_, err = tx.ExecContext(ctxWithTx, `
			INSERT INTO reviews (id, word_id, user_id, result, review_type, reviewed_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, review.ID, review.WordID, review.UserID, review.Result, review.ReviewType, time.Now())

		if err != nil {
			return err
		}

		// Update stats
		if err := r.UpdateStats(ctxWithTx, review.WordID, review.Result); err != nil {
			return err
		}

		return tx.Commit()
	}

	// Use existing transaction
	_, err := tx.ExecContext(ctx, `
		INSERT INTO reviews (id, word_id, user_id, result, review_type, reviewed_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, review.ID, review.WordID, review.UserID, review.Result, review.ReviewType, time.Now())
	return err
}

// Recalculate Daily Accuracy Rate recalculates the accuracy rate for a given day and user.
// func (r *ReviewRepository) RecalculateDailyAccuracyRate(ctx context.Context, userID string, date time.Time) error {
// 	_, err := r.db.ExecContext(ctx, `
// 		WITH daily_stats AS (
// 			SELECT
// 				COUNT(*) AS total_reviews,
// 				COUNT(*) FILTER (WHERE result = true) AS correct_reviews
// 			FROM reviews r
// 			JOIN words w ON w.id = r.word_id
// 			WHERE r.user_id = $1
// 			  AND DATE(w.created_at) = $2
// 		)
// 		UPDATE vocab_daily_stats vds
// 		SET accuracy_rate = CASE WHEN ds.total_reviews > 0 THEN ds.correct_reviews::float / ds.total_reviews ELSE 0 END,
// 		    updated_at = now()
// 		FROM daily_stats ds
// 		WHERE vds.user_id = $1 AND vds.stat_date = $2
// 	`, userID, date)
// 	return err
// }

// GetStats retrieves review statistics for a word
func (r *ReviewRepository) GetStats(ctx context.Context, wordID string) (*domain.ReviewStats, error) {
	var stats domain.ReviewStats
	var lastReviewedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, `
		SELECT
			word_id,
			total_reviews,
			correct_reviews,
			last_reviewed_at,
			accuracy_rate,
			memory_score
		FROM review_stats
		WHERE word_id = $1
	`, wordID).Scan(
		&stats.WordID,
		&stats.TotalReviews,
		&stats.CorrectReviews,
		&lastReviewedAt,
		&stats.AccuracyRate,
		&stats.MemoryScore,
	)

	if err == sql.ErrNoRows {
		// Return default stats if not found
		return &domain.ReviewStats{
			WordID:         wordID,
			TotalReviews:   0,
			CorrectReviews: 0,
			AccuracyRate:   0.0,
			MemoryScore:    0.0,
		}, nil
	}
	if err != nil {
		return nil, err
	}

	if lastReviewedAt.Valid {
		stats.LastReviewedAt = &lastReviewedAt.Time
	}

	return &stats, nil
}

// UpdateStats updates review statistics for a word.
func (r *ReviewRepository) UpdateStats(ctx context.Context, wordID string, result bool) error {
	var exec execContexter = r.db
	if tx, ok := ctx.Value(txKey).(*sql.Tx); ok {
		exec = tx
	}
	_, err := exec.ExecContext(ctx, updateStatsSQL, wordID, result)
	return err
}

// GetLastReviewType retrieves the last review type for a word
func (r *ReviewRepository) GetLastReviewType(ctx context.Context, wordID string) (string, error) {
	var reviewType sql.NullString

	err := r.db.QueryRowContext(ctx, `
		SELECT review_type 
		FROM reviews 
		WHERE word_id = $1 
		ORDER BY reviewed_at DESC 
		LIMIT 1
	`, wordID).Scan(&reviewType)

	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}

	if reviewType.Valid {
		return reviewType.String, nil
	}

	return "", nil
}

// RebuildStats rebuilds review_stats from reviews.
func (r *ReviewRepository) RebuildStats(ctx context.Context) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `TRUNCATE review_stats`); err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO review_stats (
			word_id,
			total_reviews,
			correct_reviews,
			last_reviewed_at,
			accuracy_rate
		)
		SELECT
			r.word_id,
			COUNT(*) AS total_reviews,
			COUNT(*) FILTER (WHERE r.result = true),
			MAX(r.reviewed_at),
			COUNT(*) FILTER (WHERE r.result = true)::float / COUNT(*)
		FROM reviews r
		GROUP BY r.word_id
	`)
	if err != nil {
		return err
	}

	return tx.Commit()
}
