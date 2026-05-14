package domain

import (
	"context"
	"time"
)

// Quiz type constants ordered by difficulty level (1 = easiest, 6 = hardest).
const (
	QuizTypeWordMeaningMCQ  = "word_meaning_mcq"  // L1: given English word → choose Vietnamese meaning
	QuizTypeContextFillMCQ  = "context_fill_mcq"  // L2: given sentence with blank → choose English word
	QuizTypePhraseMatch     = "phrase_match"       // L3: choose phrase that best captures the meaning
	QuizTypeReverseMCQ      = "reverse_mcq"        // L4: given Vietnamese meaning → choose English word
	QuizTypeRecallTyping    = "recall_typing"      // L5: given Vietnamese meaning → type English word
	QuizTypeContextTyping   = "context_typing"     // L6: given sentence with blank → type English word
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
}
