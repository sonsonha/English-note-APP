package domain

import (
	"context"
	"time"
)

const (
	QuizTypeMCQ       = "mcq"
	QuizTypeMatch     = "match"
	QuizTypeFillBlank = "fill_blank"
	QuizTypeTyping    = "typing"

	AdvancedQuizAccuracyThreshold = 0.7
	AdvancedQuizMinReviews        = 3
)

type WordQuiz struct {
	WordID      string
	QuizType    string
	Question    string
	Choices     []string
	Answer      string
	GeneratedAt time.Time
}

type WordQuizRepository interface {
	StoreQuizzes(ctx context.Context, quizzes []WordQuiz) error
	GetByWordID(ctx context.Context, wordID string) ([]WordQuiz, error)
	HasAdvancedQuizzes(ctx context.Context, wordID string) (bool, error)
}
