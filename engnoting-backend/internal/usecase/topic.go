package usecase

import (
	"context"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// TopicUseCase handles topic-related business logic
type TopicUseCase struct {
	wordRepo domain.WordRepository
}

// NewTopicUseCase creates a new TopicUseCase
func NewTopicUseCase(wordRepo domain.WordRepository) *TopicUseCase {
	return &TopicUseCase{wordRepo: wordRepo}
}

// GetTopicsInput represents input for getting topics
type GetTopicsInput struct {
	UserID string
}

// GetTopicsOutput represents output for getting topics
type GetTopicsOutput struct {
	Topics []domain.TopicSummary
}

// GetTopics returns all topics with word counts for a user
func (uc *TopicUseCase) GetTopics(ctx context.Context, input GetTopicsInput) (*GetTopicsOutput, error) {
	topics, err := uc.wordRepo.GetTopics(ctx, input.UserID)
	if err != nil {
		return nil, err
	}
	return &GetTopicsOutput{Topics: topics}, nil
}

// GetTopicWordsInput represents input for getting words in a topic
type GetTopicWordsInput struct {
	UserID string
	Topic  string
	Limit  int
	Offset int
}

// GetTopicWordsOutput represents output for getting words in a topic
type GetTopicWordsOutput struct {
	Words []*domain.Word
}

// GetTopicWords returns words belonging to a topic for a user
func (uc *TopicUseCase) GetTopicWords(ctx context.Context, input GetTopicWordsInput) (*GetTopicWordsOutput, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = 50
	}
	words, err := uc.wordRepo.ListByTopic(ctx, input.UserID, input.Topic, limit, input.Offset)
	if err != nil {
		return nil, err
	}
	return &GetTopicWordsOutput{Words: words}, nil
}
