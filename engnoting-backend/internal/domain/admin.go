package domain

import "context"

// AdminDashboardStats holds overview metrics for the admin dashboard.
type AdminDashboardStats struct {
	TotalUsers      int     `json:"total_users"`
	DAU             int     `json:"dau"`
	WAU             int     `json:"wau"`
	MAU             int     `json:"mau"`
	NewSignupsToday int     `json:"new_signups_today"`
	NewSignupsWeek  int     `json:"new_signups_week"`
	WordsToday      int     `json:"words_today"`
	ReviewsToday    int     `json:"reviews_today"`
	AvgWordsPerUser float64 `json:"avg_words_per_user"`
}

// WordFreq is a word text with its save frequency across all users.
type WordFreq struct {
	Text  string `json:"text"`
	Count int    `json:"count"`
}

// WordFailRate is a word with its accuracy rate and total reviews.
type WordFailRate struct {
	Text         string  `json:"text"`
	AccuracyRate float64 `json:"accuracy_rate"`
	TotalReviews int     `json:"total_reviews"`
}

// CEFRBucket is a CEFR level with its word count.
type CEFRBucket struct {
	Level string `json:"level"`
	Count int    `json:"count"`
}

// SourceBucket is a word source with its word count.
type SourceBucket struct {
	Source string `json:"source"`
	Count  int    `json:"count"`
}

// AdminVocabAnalytics holds vocabulary-level analytics.
type AdminVocabAnalytics struct {
	TopSavedWords  []WordFreq     `json:"top_saved_words"`
	TopFailedWords []WordFailRate  `json:"top_failed_words"`
	CEFRDist       []CEFRBucket   `json:"cefr_distribution"`
	SourceDist     []SourceBucket `json:"source_distribution"`
}

// AdminAIStats holds AI job queue stats.
type AdminAIStats struct {
	PendingJobs int `json:"pending_jobs"`
	FailedJobs  int `json:"failed_jobs"`
	DoneJobs    int `json:"done_jobs"`
	TotalJobs   int `json:"total_jobs"`
}

// AdminReviewAnalytics holds review system analytics.
type AdminReviewAnalytics struct {
	CompletionRate float64 `json:"completion_rate"`
	D1Retention    float64 `json:"d1_retention"`
	D7Retention    float64 `json:"d7_retention"`
	D30Retention   float64 `json:"d30_retention"`
}

// AdminStatsRepository defines analytics queries for the admin dashboard.
type AdminStatsRepository interface {
	GetDashboardStats(ctx context.Context) (*AdminDashboardStats, error)
	GetVocabAnalytics(ctx context.Context) (*AdminVocabAnalytics, error)
	GetAIStats(ctx context.Context) (*AdminAIStats, error)
	GetReviewAnalytics(ctx context.Context) (*AdminReviewAnalytics, error)
}
