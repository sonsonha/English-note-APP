package ai

import (
	"github.com/sonsonha/eng-noting/internal/domain"
)

// AIService implements domain.AIService using the AI client.
type AIService struct {
	client Client
}

// NewAIService creates a new AIService.
func NewAIService(client Client) *AIService {
	return &AIService{client: client}
}

func (s *AIService) ExplainWord(word, context string) (*domain.AIExplanation, error) {
	return ExplainWordSafe(s.client, word, context)
}

func (s *AIService) GenerateAllQuizzes(word, context string) ([]domain.AIQuiz, error) {
	return GenerateAllQuizzesSafe(s.client, word, context)
}

var _ domain.AIService = (*AIService)(nil)
