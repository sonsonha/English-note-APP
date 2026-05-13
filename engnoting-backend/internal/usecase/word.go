package usecase

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// WordUseCase handles word-related business logic
type WordUseCase struct {
	wordRepo  domain.WordRepository
	aiSvc     domain.AIService
	statsRepo domain.VocabDailyStatsRepository
	quizRepo  domain.WordQuizRepository
	jobRepo   domain.AIPendingJobRepository
}

// NewWordUseCase creates a new WordUseCase
func NewWordUseCase(wordRepo domain.WordRepository, aiSvc domain.AIService, statsRepo domain.VocabDailyStatsRepository, quizRepo domain.WordQuizRepository, jobRepo domain.AIPendingJobRepository) *WordUseCase {
	return &WordUseCase{
		wordRepo:  wordRepo,
		aiSvc:     aiSvc,
		statsRepo: statsRepo,
		quizRepo:  quizRepo,
		jobRepo:   jobRepo,
	}
}

// CreateWordInput represents input for creating a word
type CreateWordInput struct {
	UserID  string
	Text    string
	Context string
}

// CreateWordOutput represents output from creating a word
type CreateWordOutput struct {
	WordID string
}

func normalizeWordText(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func trimContext(s string) string {
	return strings.TrimSpace(s)
}

// CreateWord creates a new word and triggers AI explanation asynchronously
func (uc *WordUseCase) CreateWord(ctx context.Context, input CreateWordInput) (*CreateWordOutput, error) {
	wordID := uuid.NewString()
	now := time.Now()
	confidence := 1 // default confidence level

	text := normalizeWordText(input.Text)
	ctxTrimmed := trimContext(input.Context)

	word := &domain.Word{
		ID:         wordID,
		UserID:     input.UserID,
		Text:       text,
		Context:    &ctxTrimmed,
		Confidence: &confidence,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := uc.wordRepo.Create(ctx, word); err != nil {
		return nil, err
	}

	if err := uc.statsRepo.IncrementAddedWordsCount(ctx, input.UserID, now); err != nil {
		log.Printf("[WARN] CreateWord: failed to increment added words count for user %q: %v", input.UserID, err)
	}

	go uc.generateAIExplanation(wordID, text, ctxTrimmed)
	go uc.generateInitialQuizzes(wordID, text, ctxTrimmed)

	return &CreateWordOutput{WordID: wordID}, nil
}

// generateAIExplanation generates and stores AI explanation for a word
func (uc *WordUseCase) generateAIExplanation(wordID, word, wordContext string) {
	exp, err := uc.aiSvc.ExplainWord(word, wordContext)
	if err != nil {
		log.Printf("[WARN] generateAIExplanation: failed to explain word %q: %v", word, err)
		if enqErr := uc.jobRepo.Enqueue(context.Background(), wordID, word, wordContext, domain.AIJobTypeExplainWord); enqErr != nil {
			log.Printf("[WARN] generateAIExplanation: failed to enqueue retry: %v", enqErr)
		}
		return
	}

	aiData := &domain.WordAIData{
		WordID:       wordID,
		Definition:   exp.Definition,
		ExampleGood:  exp.ExampleGood,
		PartOfSpeech: &exp.PartOfSpeech,
		CEFRLevel:    &exp.CEFRLevel,
		VIMeaning:    &exp.VIMeaning,
		GeneratedAt:  time.Now(),
	}

	ctx := context.Background()
	_ = uc.wordRepo.StoreAIData(ctx, wordID, aiData)
}

func (uc *WordUseCase) generateInitialQuizzes(wordID, word, wordContext string) {
	quizzes, err := uc.aiSvc.GenerateInitialQuizzes(word, wordContext)
	if err != nil {
		log.Printf("[WARN] generateInitialQuizzes: failed for word %q: %v", word, err)
		if enqErr := uc.jobRepo.Enqueue(context.Background(), wordID, word, wordContext, domain.AIJobTypeInitialQuizzes); enqErr != nil {
			log.Printf("[WARN] generateInitialQuizzes: failed to enqueue retry: %v", enqErr)
		}
		return
	}

	ctx := context.Background()
	wq := make([]domain.WordQuiz, len(quizzes))
	for i, q := range quizzes {
		choices := q.Choices
		if choices == nil {
			choices = []string{}
		}
		wq[i] = domain.WordQuiz{
			WordID:   wordID,
			QuizType: q.QuizType,
			Question: q.Question,
			Choices:  choices,
			Answer:   q.Answer,
		}
	}
	if err := uc.quizRepo.StoreQuizzes(ctx, wq); err != nil {
		log.Printf("[WARN] generateInitialQuizzes: failed to store quizzes for word %q: %v", word, err)
	}
}

// RegenerateWordInput represents input for regenerating a word
type RegenerateWordInput struct {
	WordID  string
	UserID  string
	Context string
	Text    string
}

// RegenerateWordOutput represents output from regenerating a word
type RegenerateWordOutput struct {
	WordID string
}

// RegenerateWord regenerates a word
func (uc *WordUseCase) RegenerateWord(ctx context.Context, input RegenerateWordInput) (*RegenerateWordOutput, error) {
	word, err := uc.wordRepo.GetByID(ctx, input.WordID, input.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrWordNotFound) {
			return nil, domain.ErrWordNotFound
		}
		return nil, err
	}

	text := normalizeWordText(input.Text)
	if text == "" {
		return nil, domain.ErrBadRequest
	}
	ctxTrimmed := trimContext(input.Context)

	if word.AIData != nil {
		return nil, errors.New("This word already has AI data")
	}

	go uc.generateAIExplanation(word.ID, text, ctxTrimmed)

	return &RegenerateWordOutput{WordID: word.ID}, nil
}

// UpdateWordInput represents input for updating a word
type UpdateWordInput struct {
	WordID  string
	UserID  string
	Text    string
	Context string
}

// UpdateWordOutput represents output from updating a word
type UpdateWordOutput struct {
	WordID string
}

// UpdateWord updates a word
func (uc *WordUseCase) UpdateWord(ctx context.Context, input UpdateWordInput) (*UpdateWordOutput, error) {
	word, err := uc.wordRepo.GetByID(ctx, input.WordID, input.UserID)

	if err != nil {
		if errors.Is(err, domain.ErrWordNotFound) {
			return nil, domain.ErrWordNotFound
		}
		return nil, err
	}

	text := normalizeWordText(input.Text)

	if text == "" {
		return nil, domain.ErrBadRequest
	}

	word.Text = text

	if input.Context != "" {
		ctxTrimmed := trimContext(input.Context)
		word.Context = &ctxTrimmed
	}

	word.UpdatedAt = time.Now()

	if err := uc.wordRepo.Update(ctx, word); err != nil {
		return nil, err
	}

	return &UpdateWordOutput{WordID: word.ID}, nil
}

// GetWordInput represents input for getting a word
type GetWordInput struct {
	WordID string
	UserID string
}

// GetWordOutput represents output from getting a word
type GetWordOutput struct {
	Word *domain.Word
}

// GetWord retrieves a word by ID
func (uc *WordUseCase) GetWord(ctx context.Context, input GetWordInput) (*GetWordOutput, error) {
	word, err := uc.wordRepo.GetByID(ctx, input.WordID, input.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrWordNotFound) {
			return nil, domain.ErrWordNotFound
		}
		return nil, err
	}

	return &GetWordOutput{Word: word}, nil
}

// ListWordsInput represents input for listing words
type ListWordsInput struct {
	UserID string
	Limit  int
	Offset int
}

// ListWordsOutput represents output from listing words
type ListWordsOutput struct {
	Words []*domain.Word
	Total int
}

// ListWords retrieves a list of words for a user
func (uc *WordUseCase) ListWords(ctx context.Context, input ListWordsInput) (*ListWordsOutput, error) {
	words, err := uc.wordRepo.List(ctx, input.UserID, input.Limit, input.Offset)
	if err != nil {
		return nil, err
	}

	total, err := uc.wordRepo.Count(ctx, input.UserID)
	if err != nil {
		// Fallback to length if count fails
		total = len(words)
	}

	return &ListWordsOutput{
		Words: words,
		Total: total,
	}, nil
}
