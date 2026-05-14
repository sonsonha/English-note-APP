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

// SelectType determines the quiz level based on accuracy.
// Levels progress from recognition (L1) to active production (L6).
func SelectType(ctx ReviewContext) string {
	switch {
	case ctx.TotalReviews == 0 || ctx.AccuracyRate < 0.50:
		return QuizTypeWordMeaningMCQ
	case ctx.AccuracyRate < 0.62:
		return QuizTypeContextFillMCQ
	case ctx.AccuracyRate < 0.72:
		return QuizTypePhraseMatch
	case ctx.AccuracyRate < 0.82:
		return QuizTypeReverseMCQ
	case ctx.AccuracyRate < 0.92:
		return QuizTypeRecallTyping
	default:
		return QuizTypeContextTyping
	}
}

// Reason provides a short explanation for the selected review type.
func Reason(ctx ReviewContext, reviewType string) string {
	switch reviewType {
	case QuizTypeWordMeaningMCQ:
		return "Starting with recognition: choose the Vietnamese meaning"
	case QuizTypeContextFillMCQ:
		return "Building context: choose the word that fits the sentence"
	case QuizTypePhraseMatch:
		return "Deepening understanding: match the best phrase for this word"
	case QuizTypeReverseMCQ:
		return "Reversing direction: choose the English word from the Vietnamese meaning"
	case QuizTypeRecallTyping:
		return "Active recall: type the English word from its Vietnamese meaning"
	case QuizTypeContextTyping:
		return "Full production: type the word into the sentence context"
	default:
		return "Default review format"
	}
}
