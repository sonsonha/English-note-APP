package http

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

// WordUseCaser defines the word operations needed by the HTTP layer.
type WordUseCaser interface {
	CreateWord(ctx context.Context, input usecase.CreateWordInput) (*usecase.CreateWordOutput, error)
	UpdateWord(ctx context.Context, input usecase.UpdateWordInput) (*usecase.UpdateWordOutput, error)
	GetWord(ctx context.Context, input usecase.GetWordInput) (*usecase.GetWordOutput, error)
	RegenerateWord(ctx context.Context, input usecase.RegenerateWordInput) (*usecase.RegenerateWordOutput, error)
	ListWords(ctx context.Context, input usecase.ListWordsInput) (*usecase.ListWordsOutput, error)
	BackfillAIData(ctx context.Context) (*usecase.BackfillAIDataOutput, error)
}

// AuthUseCaser defines the auth operations needed by the HTTP layer.
type AuthUseCaser interface {
	Register(ctx context.Context, input usecase.RegisterInput) (*usecase.RegisterOutput, error)
	Login(ctx context.Context, input usecase.LoginInput) (*usecase.LoginOutput, error)
	RefreshToken(ctx context.Context, input usecase.RefreshTokenInput) (*usecase.RefreshTokenOutput, error)
	Logout(ctx context.Context, input usecase.RefreshTokenInput) error
	VerifyRefreshToken(ctx context.Context, input usecase.VerifyRefreshTokenInput) (*usecase.VerifyRefreshTokenOutput, error)
}

// ReviewUseCaser defines the review operations needed by the HTTP layer.
type ReviewUseCaser interface {
	SubmitReview(ctx context.Context, input usecase.SubmitReviewInput) (*usecase.SubmitReviewOutput, error)
}

// SessionUseCaser defines the session operations needed by the HTTP layer
type SessionUseCaser interface {
	StartSession(ctx context.Context, input usecase.StartSessionInput) (*usecase.StartSessionOutput, error)
}

// CalendarStatsUseCaser defines the calendar stats operations needed by the HTTP layer.
type CalendarStatsUseCaser interface {
	GetCalendarStats(ctx context.Context, input usecase.GetCalendarStatsInput) (*usecase.CalendarStatsOutput, error)
	GetCalendarSummaryStats(ctx context.Context, input usecase.CalendarSummaryStatsInput) (*usecase.CalendarSummaryStatsOutput, error)
	BackfillDailyStats(ctx context.Context, input usecase.BackfillDailyStatsInput) error
}

// WordQuizUseCaser defines the quiz operations needed by the HTTP layer.
type WordQuizUseCaser interface {
	GetQuizzesByWordID(ctx context.Context, input usecase.GetQuizzesInput) (*usecase.GetQuizzesOutput, error)
}

// TopicUseCaser defines the topic operations needed by the HTTP layer.
type TopicUseCaser interface {
	GetTopics(ctx context.Context, input usecase.GetTopicsInput) (*usecase.GetTopicsOutput, error)
	GetTopicWords(ctx context.Context, input usecase.GetTopicWordsInput) (*usecase.GetTopicWordsOutput, error)
}

// Logger interface for logging.
type Logger interface {
	Warn(msg string, fields ...any)
	Error(msg string, fields ...any)
	Info(msg string, fields ...any)
}

type stdLogger struct{}

func (l *stdLogger) Warn(msg string, fields ...any) {
	log.Printf("[WARN] %s %v", msg, fields)
}

func (l *stdLogger) Error(msg string, fields ...any) {
	log.Printf("[ERROR] %s %v", msg, fields)
}

func (l *stdLogger) Info(msg string, fields ...any) {
	log.Printf("[INFO] %s %v", msg, fields)
}

type sessionEntry struct {
	session   *domain.Session
	expiresAt time.Time
}

const sessionTTL = 24 * time.Hour

// Handler holds all HTTP handlers and their dependencies.
type Handler struct {
	authUseCase          AuthUseCaser
	wordUseCase          WordUseCaser
	reviewUseCase        ReviewUseCaser
	sessionUseCase       SessionUseCaser
	calendarStatsUseCase CalendarStatsUseCaser
	wordQuizUseCase      WordQuizUseCaser
	topicUseCase         TopicUseCaser
	logger               Logger

	sessionStore map[string]sessionEntry
	sessionMu    sync.RWMutex
}

// NewHandler creates a new HTTP handler with use cases.
func NewHandler(
	wordUseCase WordUseCaser,
	reviewUseCase ReviewUseCaser,
	sessionUseCase SessionUseCaser,
	authUseCase AuthUseCaser,
	calendarStatsUseCase CalendarStatsUseCaser,
	wordQuizUseCase WordQuizUseCaser,
	topicUseCase TopicUseCaser,
) *Handler {
	return &Handler{
		wordUseCase:          wordUseCase,
		reviewUseCase:        reviewUseCase,
		sessionUseCase:       sessionUseCase,
		authUseCase:          authUseCase,
		calendarStatsUseCase: calendarStatsUseCase,
		wordQuizUseCase:      wordQuizUseCase,
		topicUseCase:         topicUseCase,
		logger:               &stdLogger{},
		sessionStore:         make(map[string]sessionEntry),
	}
}
