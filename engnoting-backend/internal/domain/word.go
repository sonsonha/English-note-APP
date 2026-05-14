package domain

import (
	"context"
	"time"
)

// Word represents a user's saved word and metadata.
type Word struct {
	ID         string
	UserID     string
	Text       string
	Context    *string
	Source     *string
	Confidence *int // 1-5, 1 is lowest confidence, 5 is highest confidence
	CreatedAt  time.Time
	UpdatedAt  time.Time
	AIData     *WordAIData
}

// WordAIData represents AI-generated data for a word.
type WordAIData struct {
	WordID        string
	Definition    string
	ExampleGood   string
	PartOfSpeech  *string
	CEFRLevel     *string
	VIMeaning     *string
	Topic         *string
	Pronunciation *string
	GeneratedAt   time.Time
}

// TopicSummary represents a topic with its word count.
type TopicSummary struct {
	Topic     string
	WordCount int
}

// WordStats represents statistics used for review prioritization.
type WordStats struct {
	WordID         string
	Confidence     *int // 1-5, 1 is lowest confidence, 5 is highest confidence
	AccuracyRate   float64
	TotalReviews   int
	LastReviewedAt *time.Time
	RecentFailures int
	RecentReviews  int
	FrequencyScore float64 // value range from 0 to 1, higher means more frequently used word
}

// WordRepository defines persistence operations for words.
type WordRepository interface {
	Create(ctx context.Context, word *Word) error
	Update(ctx context.Context, word *Word) error
	GetByID(ctx context.Context, wordID, userID string) (*Word, error)
	List(ctx context.Context, userID string, limit, offset int) ([]*Word, error)
	ListByTopic(ctx context.Context, userID, topic string, limit, offset int) ([]*Word, error)
	ListBySource(ctx context.Context, userID, source string) ([]*Word, error)
	Count(ctx context.Context, userID string) (int, error)
	StoreAIData(ctx context.Context, wordID string, aiData *WordAIData) error
	UpdateVIMeaning(ctx context.Context, wordID, viMeaning string) error
	UpdateTopic(ctx context.Context, wordID, topic string) error
	ListMissingVIMeaning(ctx context.Context, limit int) ([]*Word, error)
	ListMissingTopic(ctx context.Context, limit int) ([]*Word, error)
	ListMissingQuizzes(ctx context.Context, limit int) ([]*Word, error)
	GetTopics(ctx context.Context, userID string) ([]TopicSummary, error)
}

// WordStatsRepository defines persistence operations for word stats.
type WordStatsRepository interface {
	LoadStats(ctx context.Context, userID string) ([]WordStats, error)
}
