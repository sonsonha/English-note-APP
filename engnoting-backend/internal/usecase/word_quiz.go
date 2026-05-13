package usecase

import (
	"context"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type WordQuizUseCase struct {
	quizRepo domain.WordQuizRepository
	wordRepo domain.WordRepository
}

func NewWordQuizUseCase(quizRepo domain.WordQuizRepository, wordRepo domain.WordRepository) *WordQuizUseCase {
	return &WordQuizUseCase{quizRepo: quizRepo, wordRepo: wordRepo}
}

type GetQuizzesInput struct {
	UserID   string
	WordID   string
	QuizType string // optional filter for quiz type
}

type GetQuizzesOutput struct {
	Quizzes []domain.WordQuiz
}

func (uc *WordQuizUseCase) GetQuizzesByWordID(ctx context.Context, input GetQuizzesInput) (*GetQuizzesOutput, error) {
	if _, err := uc.wordRepo.GetByID(ctx, input.WordID, input.UserID); err != nil {
		return nil, err
	}
	quizzes, err := uc.quizRepo.GetByWordID(ctx, input.WordID)
	if err != nil {
		return nil, err
	}
	if input.QuizType != "" {
		filtered := quizzes[:0]
		for _, q := range quizzes {
			if q.QuizType == input.QuizType {
				filtered = append(filtered, q)
			}
		}
		quizzes = filtered
	}
	return &GetQuizzesOutput{Quizzes: quizzes}, nil
}
