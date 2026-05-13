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

func (r *VocabDailyStatsRepository) RecalculateDailyAccuracyRate(ctx context.Context, userID string, date time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE vocab_daily_stats
		SET accuracy_rate = (
			SELECT COALESCE(AVG(rs.accuracy_rate), 0)
			FROM (
				SELECT DISTINCT word_id
				FROM reviews
				WHERE user_id = $1 AND DATE(reviewed_at) = $2
			) daily
			JOIN review_stats rs ON rs.word_id = daily.word_id
			WHERE rs.total_reviews > 0
		),
		updated_at = now()
		WHERE user_id = $1 AND stat_date = $2
	`, userID, date)
	return err
}
