package repository

import (
	"database/sql"
	"time"

	"context"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type VocabDailyStatsRepository struct {
	db *sql.DB
}

func NewVocabDailyStatsRepository(db *sql.DB) *VocabDailyStatsRepository {
	return &VocabDailyStatsRepository{db: db}
}

func (r *VocabDailyStatsRepository) GetStats(ctx context.Context, userID string, from, to time.Time) ([]domain.VocabDailyStats, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT user_id, stat_date, added_words_count, reviewed_words_count, accuracy_rate, status, updated_at FROM vocab_daily_stats WHERE user_id = $1 AND stat_date BETWEEN $2 AND $3
	`, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []domain.VocabDailyStats
	for rows.Next() {
		var stat domain.VocabDailyStats
		err := rows.Scan(&stat.UserID, &stat.StatDate, &stat.AddedWordsCount, &stat.ReviewedWordsCount, &stat.AccuracyRate, &stat.Status, &stat.UpdatedAt)
		if err != nil {
			return nil, err
		}
		stats = append(stats, stat)
	}
	return stats, rows.Err()
}

// func (r *VocabDailyStatsRepository) IncrementAddedWordsCount(ctx context.Context, userID string, date time.Time) error {
// 	_, err := r.db.ExecContext(ctx, `
// 		INSERT INTO vocab_daily_stats (user_id, stat_date, added_words_count)
// 		VALUES ($1, $2, 1)
// 		ON CONFLICT (user_id, stat_date) DO UPDATE SET added_words_count = vocab_daily_stats.added_words_count + 1, updated_at = EXCLUDED.updated_at
// 	`, userID, date)
// 	return err
// }

func (r *VocabDailyStatsRepository) UpdateAccuracyRate(ctx context.Context, userID string, date time.Time, accuracyRate float64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats SET accuracy_rate = $3 WHERE user_id = $1 AND stat_date = $2
	`, userID, date, accuracyRate)
	return err
}

func (r *VocabDailyStatsRepository) UpdateStatus(ctx context.Context, userID string, date time.Time, status domain.CalendarStatus) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats SET status = $3 WHERE user_id = $1 AND stat_date = $2
	`, userID, date, status)
	return err
}

func (r *VocabDailyStatsRepository) ResetDailyStats(ctx context.Context, userID string, date time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats SET added_words_count = 0, reviewed_words_count = 0, accuracy_rate = 0.0, status = 'none', updated_at = NOW() WHERE user_id = $1 AND stat_date = $2
	`, userID, date)
	return err
}

func (r *VocabDailyStatsRepository) IncrementAddedWordsCountBy(ctx context.Context, userID string, date time.Time, count int) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO vocab_daily_stats (user_id, stat_date, added_words_count)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, stat_date) DO UPDATE SET added_words_count = vocab_daily_stats.added_words_count + EXCLUDED.added_words_count, updated_at = now()
	`, userID, date, count)
	return err
}

func (r *VocabDailyStatsRepository) IncrementReviewedWordsCountBy(ctx context.Context, userID string, date time.Time, count int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats SET reviewed_words_count = reviewed_words_count + $3 WHERE user_id = $1 AND stat_date = $2
	`, userID, date, count)
	return err
}

func (r *VocabDailyStatsRepository) IncrementAddedWordsCount(ctx context.Context, userID string, date time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO vocab_daily_stats (user_id, stat_date, added_words_count)
		VALUES ($1, $2, 1)
		ON CONFLICT (user_id, stat_date) DO UPDATE SET added_words_count = vocab_daily_stats.added_words_count + 1, updated_at = now()
	`, userID, date)
	return err
}

func (r *VocabDailyStatsRepository) ResetReviewedWordsCount(ctx context.Context, userID string, date time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats SET reviewed_words_count = 0 WHERE user_id = $1 AND stat_date = $2
	`, userID, date)
	return err
}

func (r *VocabDailyStatsRepository) IncrementReviewedWordsCount(ctx context.Context, userID string, date time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO vocab_daily_stats (user_id, stat_date, reviewed_words_count)
		VALUES ($1, $2, 1)
		ON CONFLICT (user_id, stat_date) DO UPDATE SET reviewed_words_count = vocab_daily_stats.reviewed_words_count + 1, updated_at = now()
	`, userID, date)
	return err
}

func (r *VocabDailyStatsRepository) BackfillDailyStats(ctx context.Context, userID string) error {
	// Rebuild added_words_count from words table
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO vocab_daily_stats (user_id, stat_date, added_words_count, updated_at)
		SELECT user_id, DATE(created_at) AS stat_date, COUNT(*) AS added_words_count, now()
		FROM words
		WHERE user_id = $1
		GROUP BY user_id, DATE(created_at)
		ON CONFLICT (user_id, stat_date) DO UPDATE
		SET added_words_count = EXCLUDED.added_words_count, updated_at = now()
	`, userID)
	if err != nil {
		return err
	}

	// Rebuild reviewed_words_count: count distinct reviewed words grouped by the day they were added
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO vocab_daily_stats (user_id, stat_date, reviewed_words_count, updated_at)
		SELECT w.user_id, DATE(w.created_at) AS stat_date, COUNT(DISTINCT r.word_id) AS reviewed_words_count, now()
		FROM reviews r
		JOIN words w ON w.id = r.word_id
		WHERE w.user_id = $1
		GROUP BY w.user_id, DATE(w.created_at)
		ON CONFLICT (user_id, stat_date) DO UPDATE
		SET reviewed_words_count = EXCLUDED.reviewed_words_count, updated_at = now()
	`, userID)
	if err != nil {
		return err
	}

	// Recalculate accuracy_rate: avg accuracy of words added on each day
	_, err = r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats vds
		SET accuracy_rate = (
			SELECT COALESCE(AVG(rs.accuracy_rate), 0)
			FROM words w
			JOIN review_stats rs ON rs.word_id = w.id
			WHERE w.user_id = $1
			  AND DATE(w.created_at) = vds.stat_date
			  AND rs.total_reviews > 0
		),
		updated_at = now()
		WHERE user_id = $1
	`, userID)
	if err != nil {
		return err
	}

	// Recalculate status from counts
	_, err = r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats
		SET status = CASE
			WHEN added_words_count = 0 THEN 'fallow'
			WHEN reviewed_words_count = 0 THEN 'tending'
			WHEN accuracy_rate >= 0.8 THEN 'mastered'
			WHEN accuracy_rate >= 0.6 THEN 'steady'
			ELSE 'tending'
		END
		WHERE user_id = $1
	`, userID)
	return err
}

func (r *VocabDailyStatsRepository) RecalculateDailyStatus(ctx context.Context, userID string, date time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats
		SET status = CASE
			WHEN added_words_count = 0 THEN 'fallow'
			WHEN reviewed_words_count = 0 THEN 'tending'
			WHEN accuracy_rate >= 0.8 THEN 'mastered'
			WHEN accuracy_rate >= 0.6 THEN 'steady'
			ELSE 'tending'
		END,
		updated_at = now()
		WHERE user_id = $1 AND stat_date = $2
	`, userID, date)
	return err
}

func (r *VocabDailyStatsRepository) RecalculateDailyAccuracyRate(ctx context.Context, userID string, date time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats
		SET accuracy_rate = (
			SELECT COALESCE(AVG(rs.accuracy_rate), 0)
			FROM words w
			JOIN review_stats rs ON rs.word_id = w.id
			WHERE w.user_id = $1
			  AND DATE(w.created_at) = $2
			  AND rs.total_reviews > 0
		),
		updated_at = now()
		WHERE user_id = $1 AND stat_date = $2
	`, userID, date)
	return err
}
