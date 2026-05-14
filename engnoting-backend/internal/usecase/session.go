package usecase

import (
	"context"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// SessionUseCase handles session-related business logic
type SessionUseCase struct {
	queueRepo     domain.ReviewQueueRepository
	wordStatsRepo domain.WordStatsRepository
	reviewRepo    domain.ReviewRepository
	wordRepo      domain.WordRepository
	quizRepo      domain.WordQuizRepository
}

// NewSessionUseCase creates a new SessionUseCase
func NewSessionUseCase(
	queueRepo domain.ReviewQueueRepository,
	wordStatsRepo domain.WordStatsRepository,
	reviewRepo domain.ReviewRepository,
	wordRepo domain.WordRepository,
	quizRepo domain.WordQuizRepository,
) *SessionUseCase {
	return &SessionUseCase{
		queueRepo:     queueRepo,
		wordStatsRepo: wordStatsRepo,
		reviewRepo:    reviewRepo,
		wordRepo:      wordRepo,
		quizRepo:      quizRepo,
	}
}

// StartSessionInput represents input for starting a session
type StartSessionInput struct {
	UserID string
	Limit  int        // 0 = default (10)
	From   *time.Time // nil = all words
	To     *time.Time // nil = all words
	Topic  string     // "" = all topics
}

// StartSessionOutput represents output from starting a session
type StartSessionOutput struct {
	SessionID string
	Items     []domain.SessionItem
	Total     int
}

// StartSession starts a new review session
func (uc *SessionUseCase) StartSession(ctx context.Context, input StartSessionInput) (*StartSessionOutput, error) {
	if err := uc.rebuildReviewQueue(ctx, input.UserID); err != nil {
		return nil, err
	}

	session, err := uc.buildSession(ctx, input)
	if err != nil {
		return nil, err
	}

	return &StartSessionOutput{
		SessionID: "",
		Items:     session.Items,
		Total:     len(session.Items),
	}, nil
}

// rebuildReviewQueue rebuilds the review queue for a user
func (uc *SessionUseCase) rebuildReviewQueue(ctx context.Context, userID string) error {
	// Load word stats
	stats, err := uc.wordStatsRepo.LoadStats(ctx, userID)
	if err != nil {
		return err
	}

	// Calculate MPS for each word and build queue items
	var queueItems []domain.ReviewQueueItem
	for _, stat := range stats {
		mpsScore, mpsReason := domain.CalculateMPS(stat)

		// Skip low priority words
		if mpsScore < 30 {
			continue
		}

		queueItems = append(queueItems, domain.ReviewQueueItem{
			UserID:        userID,
			WordID:        stat.WordID,
			PriorityScore: mpsScore,
			Reason:        mpsReason,
		})
	}

	return uc.queueRepo.Rebuild(ctx, userID, queueItems)
}

// buildSession builds a session from the review queue, respecting optional date filter and limit.
func (uc *SessionUseCase) buildSession(ctx context.Context, input StartSessionInput) (*domain.Session, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = 10
	}

	var queueItems []domain.ReviewQueueItem
	var err error

	switch {
	case input.Topic != "":
		queueItems, err = uc.queueRepo.GetQueueItemsByTopic(ctx, input.UserID, input.Topic)
	case input.From != nil && input.To != nil:
		queueItems, err = uc.queueRepo.GetQueueItemsInRange(ctx, input.UserID, *input.From, *input.To, limit)
	default:
		queueItems, err = uc.queueRepo.GetQueueItems(ctx, input.UserID)
	}
	if err != nil {
		return nil, err
	}

	// Topic and date-filtered sessions take top N straight; default sessions split critical/normal.
	var items []domain.SessionItem
	if input.Topic != "" || (input.From != nil && input.To != nil) {
		items = uc.pickItems(ctx, input.UserID, queueItems, limit)
	} else {
		maxCritical := (limit + 1) / 2
		maxNormal := limit - maxCritical
		items = uc.pickItemsCriticalNormal(ctx, input.UserID, queueItems, maxCritical, maxNormal)
	}

	// Enrich with word text and matching quiz (best-effort).
	for i, item := range items {
		if word, err := uc.wordRepo.GetByID(ctx, item.WordID, input.UserID); err == nil && word != nil {
			items[i].WordText = word.Text
		}
		if quizzes, err := uc.quizRepo.GetByWordID(ctx, item.WordID); err == nil {
			for _, q := range quizzes {
				if q.QuizType == item.ReviewType {
					quiz := q
					items[i].Quiz = &quiz
					break
				}
			}
		}
	}

	return &domain.Session{UserID: input.UserID, Items: items, Index: 0}, nil
}

func (uc *SessionUseCase) makeSessionItem(ctx context.Context, item domain.ReviewQueueItem) (domain.SessionItem, bool) {
	stats, err := uc.reviewRepo.GetStats(ctx, item.WordID)
	if err != nil {
		return domain.SessionItem{}, false
	}
	lastReviewType, _ := uc.reviewRepo.GetLastReviewType(ctx, item.WordID)
	reviewCtx := domain.ReviewContext{
		MPS:            item.PriorityScore,
		AccuracyRate:   stats.AccuracyRate,
		TotalReviews:   stats.TotalReviews,
		LastReviewType: lastReviewType,
	}
	reviewType := domain.SelectType(reviewCtx)
	return domain.SessionItem{
		WordID:        item.WordID,
		ReviewType:    reviewType,
		PriorityScore: item.PriorityScore,
		AccuracyRate:  stats.AccuracyRate,
		Reason:        item.Reason + ". " + domain.Reason(reviewCtx, reviewType),
	}, true
}

// pickItems takes the top N items by priority score (used for date-filtered sessions).
func (uc *SessionUseCase) pickItems(ctx context.Context, userID string, queue []domain.ReviewQueueItem, limit int) []domain.SessionItem {
	var items []domain.SessionItem
	for _, qi := range queue {
		if len(items) >= limit {
			break
		}
		if si, ok := uc.makeSessionItem(ctx, qi); ok {
			items = append(items, si)
		}
	}
	return items
}

// pickItemsCriticalNormal splits items into critical (MPS≥60) and normal (MPS≥40) buckets.
func (uc *SessionUseCase) pickItemsCriticalNormal(ctx context.Context, userID string, queue []domain.ReviewQueueItem, maxCritical, maxNormal int) []domain.SessionItem {
	var critical, normal []domain.SessionItem
	for _, qi := range queue {
		si, ok := uc.makeSessionItem(ctx, qi)
		if !ok {
			continue
		}
		switch {
		case qi.PriorityScore >= 60 && len(critical) < maxCritical:
			critical = append(critical, si)
		case qi.PriorityScore >= 40 && len(normal) < maxNormal:
			normal = append(normal, si)
		}
		if len(critical) == maxCritical && len(normal) == maxNormal {
			break
		}
	}
	return append(critical, normal...)
}
