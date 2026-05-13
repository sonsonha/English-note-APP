package domain

import (
	"context"
	"time"
)

// Review represents a single review event.
type Review struct {
	ID         string
	WordID     string
	UserID     string
	Result     bool
	ReviewType string
}

// ReviewStats represents aggregate review statistics for a word.
type ReviewStats struct {
	WordID         string
	TotalReviews   int
	CorrectReviews int
	LastReviewedAt *time.Time
	AccuracyRate   float64
	MemoryScore    float64
}

// ReviewRepository defines persistence operations for reviews and stats.
type ReviewRepository interface {
	Create(ctx context.Context, review *Review) error
	GetStats(ctx context.Context, wordID string) (*ReviewStats, error)
	UpdateStats(ctx context.Context, wordID string, result bool) error
	GetLastReviewType(ctx context.Context, wordID string) (string, error)
	RebuildStats(ctx context.Context) error
}

// ReviewContext provides signals for choosing review format.
type ReviewContext struct {
	MPS            float64
	AccuracyRate   float64
	TotalReviews   int
	LastReviewType string
}

// SelectType determines the review format based on mastery.
func SelectType(ctx ReviewContext) string {
	switch {
	case ctx.TotalReviews == 0 || ctx.AccuracyRate < 0.4:
		return "mcq"
	case ctx.AccuracyRate < 0.7:
		return "match"
	case ctx.AccuracyRate >= 0.8 && ctx.TotalReviews >= 5:
		return "fill_blank"
	default:
		return "typing"
	}
}

// Reason provides a short explanation for the selected review type.
func Reason(ctx ReviewContext, reviewType string) string {
	switch reviewType {
	case "mcq":
		return "Low accuracy; use multiple choice to reinforce basics"
	case "match":
		return "Medium accuracy; matching helps recall and associations"
	case "fill_blank":
		return "High mastery; fill-in-blank tests precise recall"
	case "typing":
		return "High accuracy; typing strengthens long-term retention"
	default:
		return "Default review format"
	}
}
