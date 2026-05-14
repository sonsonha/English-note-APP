package repository

import (
	"context"
	"database/sql"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// AdminStatsRepository implements domain.AdminStatsRepository using PostgreSQL.
type AdminStatsRepository struct {
	db *sql.DB
}

// NewAdminStatsRepository creates a new AdminStatsRepository.
func NewAdminStatsRepository(db *sql.DB) *AdminStatsRepository {
	return &AdminStatsRepository{db: db}
}

func (r *AdminStatsRepository) GetDashboardStats(ctx context.Context) (*domain.AdminDashboardStats, error) {
	stats := &domain.AdminDashboardStats{}

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers); err != nil {
		return nil, err
	}

	// DAU: distinct users who saved a word or did a review today
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT u) FROM (
			SELECT user_id AS u FROM words  WHERE DATE(created_at)  = CURRENT_DATE
			UNION
			SELECT user_id AS u FROM reviews WHERE DATE(reviewed_at) = CURRENT_DATE
		) t
	`).Scan(&stats.DAU); err != nil {
		return nil, err
	}

	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT u) FROM (
			SELECT user_id AS u FROM words  WHERE created_at  >= NOW() - INTERVAL '7 days'
			UNION
			SELECT user_id AS u FROM reviews WHERE reviewed_at >= NOW() - INTERVAL '7 days'
		) t
	`).Scan(&stats.WAU); err != nil {
		return nil, err
	}

	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(DISTINCT u) FROM (
			SELECT user_id AS u FROM words  WHERE created_at  >= NOW() - INTERVAL '30 days'
			UNION
			SELECT user_id AS u FROM reviews WHERE reviewed_at >= NOW() - INTERVAL '30 days'
		) t
	`).Scan(&stats.MAU); err != nil {
		return nil, err
	}

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE`).Scan(&stats.NewSignupsToday); err != nil {
		return nil, err
	}

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`).Scan(&stats.NewSignupsWeek); err != nil {
		return nil, err
	}

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM words WHERE DATE(created_at) = CURRENT_DATE`).Scan(&stats.WordsToday); err != nil {
		return nil, err
	}

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM reviews WHERE DATE(reviewed_at) = CURRENT_DATE`).Scan(&stats.ReviewsToday); err != nil {
		return nil, err
	}

	if err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(AVG(wc), 0) FROM (
			SELECT COUNT(*) AS wc FROM words GROUP BY user_id
		) t
	`).Scan(&stats.AvgWordsPerUser); err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *AdminStatsRepository) GetVocabAnalytics(ctx context.Context) (*domain.AdminVocabAnalytics, error) {
	analytics := &domain.AdminVocabAnalytics{
		TopSavedWords:  []domain.WordFreq{},
		TopFailedWords: []domain.WordFailRate{},
		CEFRDist:       []domain.CEFRBucket{},
		SourceDist:     []domain.SourceBucket{},
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT text, COUNT(*) AS cnt FROM words GROUP BY text ORDER BY cnt DESC LIMIT 10
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var wf domain.WordFreq
		if err := rows.Scan(&wf.Text, &wf.Count); err != nil {
			return nil, err
		}
		analytics.TopSavedWords = append(analytics.TopSavedWords, wf)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	rows2, err := r.db.QueryContext(ctx, `
		SELECT w.text, rs.accuracy_rate, rs.total_reviews
		FROM review_stats rs
		JOIN words w ON rs.word_id = w.id
		WHERE rs.total_reviews >= 5
		ORDER BY rs.accuracy_rate ASC
		LIMIT 10
	`)
	if err != nil {
		return nil, err
	}
	defer rows2.Close()
	for rows2.Next() {
		var wf domain.WordFailRate
		if err := rows2.Scan(&wf.Text, &wf.AccuracyRate, &wf.TotalReviews); err != nil {
			return nil, err
		}
		analytics.TopFailedWords = append(analytics.TopFailedWords, wf)
	}
	if err := rows2.Err(); err != nil {
		return nil, err
	}

	rows3, err := r.db.QueryContext(ctx, `
		SELECT COALESCE(cefr_level, 'unknown'), COUNT(*) AS cnt
		FROM word_ai_data
		GROUP BY cefr_level
		ORDER BY cnt DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows3.Close()
	for rows3.Next() {
		var cb domain.CEFRBucket
		if err := rows3.Scan(&cb.Level, &cb.Count); err != nil {
			return nil, err
		}
		analytics.CEFRDist = append(analytics.CEFRDist, cb)
	}
	if err := rows3.Err(); err != nil {
		return nil, err
	}

	rows4, err := r.db.QueryContext(ctx, `
		SELECT COALESCE(source, 'direct'), COUNT(*) AS cnt
		FROM words
		GROUP BY source
		ORDER BY cnt DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, err
	}
	defer rows4.Close()
	for rows4.Next() {
		var sb domain.SourceBucket
		if err := rows4.Scan(&sb.Source, &sb.Count); err != nil {
			return nil, err
		}
		analytics.SourceDist = append(analytics.SourceDist, sb)
	}
	return analytics, rows4.Err()
}

func (r *AdminStatsRepository) GetAIStats(ctx context.Context) (*domain.AdminAIStats, error) {
	stats := &domain.AdminAIStats{}

	rows, err := r.db.QueryContext(ctx, `SELECT status, COUNT(*) FROM ai_pending_jobs GROUP BY status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		stats.TotalJobs += count
		switch status {
		case "pending":
			stats.PendingJobs = count
		case "failed":
			stats.FailedJobs = count
		case "done":
			stats.DoneJobs = count
		}
	}
	return stats, rows.Err()
}

func (r *AdminStatsRepository) GetReviewAnalytics(ctx context.Context) (*domain.AdminReviewAnalytics, error) {
	analytics := &domain.AdminReviewAnalytics{}

	// Completion rate: % of words that have been reviewed at least once
	if err := r.db.QueryRowContext(ctx, `
		SELECT CASE WHEN total = 0 THEN 0
		       ELSE reviewed * 100.0 / total END
		FROM (
			SELECT
				COUNT(DISTINCT w.id) AS total,
				COUNT(DISTINCT rs.word_id) FILTER (WHERE rs.total_reviews > 0) AS reviewed
			FROM words w
			LEFT JOIN review_stats rs ON rs.word_id = w.id
		) t
	`).Scan(&analytics.CompletionRate); err != nil {
		return nil, err
	}

	// D1: % of users registered > 2 days ago who reviewed within their first 2 days
	if err := r.db.QueryRowContext(ctx, `
		SELECT CASE WHEN COUNT(*) = 0 THEN 0
		       ELSE COUNT(CASE WHEN active THEN 1 END) * 100.0 / COUNT(*) END
		FROM (
			SELECT EXISTS(
				SELECT 1 FROM reviews r
				WHERE r.user_id = u.id
				AND r.reviewed_at <= u.created_at + INTERVAL '2 days'
			) AS active
			FROM users u
			WHERE u.created_at < NOW() - INTERVAL '2 days'
		) t
	`).Scan(&analytics.D1Retention); err != nil {
		return nil, err
	}

	// D7
	if err := r.db.QueryRowContext(ctx, `
		SELECT CASE WHEN COUNT(*) = 0 THEN 0
		       ELSE COUNT(CASE WHEN active THEN 1 END) * 100.0 / COUNT(*) END
		FROM (
			SELECT EXISTS(
				SELECT 1 FROM reviews r
				WHERE r.user_id = u.id
				AND r.reviewed_at <= u.created_at + INTERVAL '8 days'
			) AS active
			FROM users u
			WHERE u.created_at < NOW() - INTERVAL '8 days'
		) t
	`).Scan(&analytics.D7Retention); err != nil {
		return nil, err
	}

	// D30
	if err := r.db.QueryRowContext(ctx, `
		SELECT CASE WHEN COUNT(*) = 0 THEN 0
		       ELSE COUNT(CASE WHEN active THEN 1 END) * 100.0 / COUNT(*) END
		FROM (
			SELECT EXISTS(
				SELECT 1 FROM reviews r
				WHERE r.user_id = u.id
				AND r.reviewed_at <= u.created_at + INTERVAL '31 days'
			) AS active
			FROM users u
			WHERE u.created_at < NOW() - INTERVAL '31 days'
		) t
	`).Scan(&analytics.D30Retention); err != nil {
		return nil, err
	}

	return analytics, nil
}
