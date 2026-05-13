package usecase

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
)

// mockQueueRepo implements domain.ReviewQueueRepository.
type mockQueueRepo struct {
	rebuildFn      func(ctx context.Context, userID string, items []domain.ReviewQueueItem) error
	getQueueItemsFn func(ctx context.Context, userID string) ([]domain.ReviewQueueItem, error)
}

func (m *mockQueueRepo) Rebuild(ctx context.Context, userID string, items []domain.ReviewQueueItem) error {
	if m.rebuildFn != nil {
		return m.rebuildFn(ctx, userID, items)
	}
	return nil
}

func (m *mockQueueRepo) GetQueueItems(ctx context.Context, userID string) ([]domain.ReviewQueueItem, error) {
	if m.getQueueItemsFn != nil {
		return m.getQueueItemsFn(ctx, userID)
	}
	return nil, nil
}

func (m *mockQueueRepo) GetQueueItemsInRange(ctx context.Context, userID string, from, to time.Time, limit int) ([]domain.ReviewQueueItem, error) {
	return nil, nil
}

// mockWordStatsRepo implements domain.WordStatsRepository.
type mockWordStatsRepo struct {
	loadStatsFn func(ctx context.Context, userID string) ([]domain.WordStats, error)
}

func (m *mockWordStatsRepo) LoadStats(ctx context.Context, userID string) ([]domain.WordStats, error) {
	if m.loadStatsFn != nil {
		return m.loadStatsFn(ctx, userID)
	}
	return nil, nil
}

// highMPSStat returns a WordStats that produces a score ≥ 30 (enough to enter the queue).
func highMPSStat(wordID string) domain.WordStats {
	return domain.WordStats{
		WordID:       wordID,
		AccuracyRate: 0.0, // accuracy factor = 1.0 → 30 points
		Confidence:   nil,
	}
}

// criticalStat produces a score ≥ 60 (critical priority).
func criticalStat(wordID string) domain.WordStats {
	return domain.WordStats{
		WordID:         wordID,
		LastReviewedAt: nil, // 30 days → timeFactor = 1.0 → 30 pts
		AccuracyRate:   0.0, // accuracyFactor = 1.0 → 30 pts
		Confidence:     nil, // confidenceFactor = 0.5 → 7.5 pts
		// total: ~67.5 (≥ 60)
	}
}

// normalStat produces a score between 40 and 59.
func normalStat(wordID string) domain.WordStats {
	past := time.Now().Add(-5 * 24 * time.Hour) // 5 days → timeFactor ~0.167 → ~5 pts
	conf := 2                                    // confidenceFactor = 0.6 → 9 pts
	return domain.WordStats{
		WordID:         wordID,
		LastReviewedAt: &past,
		AccuracyRate:   0.3, // accuracyFactor = 0.7 → 21 pts
		Confidence:     &conf,
		RecentReviews:  5,
		RecentFailures: 3, // failureFactor = 0.6 → 9 pts
		FrequencyScore: 0.1, // 1 pt
		// total: ~45 pts (in [40,59] range)
	}
}

func makeReviewStats(wordID string, totalReviews int, accuracy float64) *domain.ReviewStats {
	return &domain.ReviewStats{
		WordID:       wordID,
		TotalReviews: totalReviews,
		AccuracyRate: accuracy,
	}
}

func TestSessionUseCase_StartSession(t *testing.T) {
	ctx := context.Background()

	t.Run("LoadStats error is propagated", func(t *testing.T) {
		loadErr := errors.New("stats db error")
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, loadErr
			},
		}
		uc := NewSessionUseCase(&mockQueueRepo{}, statsRepo, &mockReviewRepo{}, &mockWordRepo{}, &mockQuizRepo{})
		_, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if !errors.Is(err, loadErr) {
			t.Errorf("error = %v, want %v", err, loadErr)
		}
	})

	t.Run("all stats below MPS threshold 30 gives empty session", func(t *testing.T) {
		// All words reviewed recently with perfect accuracy → MPS ≈ 0
		recentTime := time.Now()
		conf := 5
		belowThreshold := domain.WordStats{
			WordID:         "w1",
			LastReviewedAt: &recentTime,
			AccuracyRate:   1.0,
			Confidence:     &conf,
			FrequencyScore: 0,
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return []domain.WordStats{belowThreshold}, nil
			},
		}
		var rebuiltItems []domain.ReviewQueueItem
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, items []domain.ReviewQueueItem) error {
				rebuiltItems = items
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return nil, nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, &mockReviewRepo{}, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(rebuiltItems) != 0 {
			t.Errorf("rebuilt queue should be empty, got %d items", len(rebuiltItems))
		}
		if len(out.Items) != 0 {
			t.Errorf("session items should be empty, got %d", len(out.Items))
		}
	})

	t.Run("stats above threshold are included in queue rebuild", func(t *testing.T) {
		stats := []domain.WordStats{highMPSStat("w1"), highMPSStat("w2")}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return stats, nil
			},
		}
		var rebuiltItems []domain.ReviewQueueItem
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, items []domain.ReviewQueueItem) error {
				rebuiltItems = items
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return nil, nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, &mockReviewRepo{}, &mockWordRepo{}, &mockQuizRepo{})
		_, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(rebuiltItems) != 2 {
			t.Errorf("rebuilt queue = %d items, want 2", len(rebuiltItems))
		}
	})

	t.Run("queueRepo Rebuild error is propagated", func(t *testing.T) {
		rebuildErr := errors.New("rebuild failed")
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return []domain.WordStats{highMPSStat("w1")}, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return rebuildErr
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, &mockReviewRepo{}, &mockWordRepo{}, &mockQuizRepo{})
		_, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if !errors.Is(err, rebuildErr) {
			t.Errorf("error = %v, want %v", err, rebuildErr)
		}
	})

	t.Run("GetQueueItems error is propagated", func(t *testing.T) {
		getErr := errors.New("queue fetch failed")
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return nil, getErr
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, &mockReviewRepo{}, &mockWordRepo{}, &mockQuizRepo{})
		_, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if !errors.Is(err, getErr) {
			t.Errorf("error = %v, want %v", err, getErr)
		}
	})

	t.Run("GetStats error for an item causes that item to be skipped", func(t *testing.T) {
		queueItems := []domain.ReviewQueueItem{
			{UserID: "u1", WordID: "skip-me", PriorityScore: 80},
			{UserID: "u1", WordID: "include-me", PriorityScore: 80},
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return queueItems, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			getStatsFn: func(_ context.Context, wordID string) (*domain.ReviewStats, error) {
				if wordID == "skip-me" {
					return nil, errors.New("stats not found")
				}
				return makeReviewStats(wordID, 10, 0.9), nil
			},
			getLastReviewTypeFn: func(_ context.Context, _ string) (string, error) {
				return "mcq", nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, reviewRepo, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(out.Items) != 1 {
			t.Errorf("session items = %d, want 1 (skip-me excluded)", len(out.Items))
		}
		if out.Items[0].WordID != "include-me" {
			t.Errorf("item WordID = %q, want %q", out.Items[0].WordID, "include-me")
		}
	})

	t.Run("critical items capped at MaxCritical=5 (overflow goes to normal)", func(t *testing.T) {
		// 7 items with score 70 (≥ 60 = critical). First 5 fill critical;
		// items 6-7 overflow into normal since score 70 ≥ 40.
		queueItems := make([]domain.ReviewQueueItem, 7)
		for i := range queueItems {
			queueItems[i] = domain.ReviewQueueItem{
				UserID: "u1", WordID: fmt.Sprintf("crit-%d", i), PriorityScore: 70,
			}
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return queueItems, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			getStatsFn: func(_ context.Context, wordID string) (*domain.ReviewStats, error) {
				return makeReviewStats(wordID, 10, 0.9), nil
			},
			getLastReviewTypeFn: func(_ context.Context, _ string) (string, error) {
				return "", nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, reviewRepo, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// 5 critical + 2 overflow into normal = 7 total
		if len(out.Items) != 7 {
			t.Errorf("session items = %d, want 7 (5 critical + 2 overflow to normal)", len(out.Items))
		}
	})

	t.Run("critical items strictly capped when normal is also full", func(t *testing.T) {
		// Fill both critical (score ≥ 60) and normal (score 40-59) to their limits,
		// then add extra items that can't fit anywhere → total is MaxCritical + MaxNormal = 10.
		queueItems := make([]domain.ReviewQueueItem, 14) // 7 critical + 7 normal
		for i := 0; i < 7; i++ {
			queueItems[i] = domain.ReviewQueueItem{
				UserID: "u1", WordID: fmt.Sprintf("crit-%d", i), PriorityScore: 70,
			}
		}
		for i := 7; i < 14; i++ {
			queueItems[i] = domain.ReviewQueueItem{
				UserID: "u1", WordID: fmt.Sprintf("norm-%d", i), PriorityScore: 50,
			}
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return queueItems, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			getStatsFn: func(_ context.Context, wordID string) (*domain.ReviewStats, error) {
				return makeReviewStats(wordID, 10, 0.9), nil
			},
			getLastReviewTypeFn: func(_ context.Context, _ string) (string, error) {
				return "", nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, reviewRepo, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(out.Items) != 10 {
			t.Errorf("session items = %d, want 10 (MaxCritical=5 + MaxNormal=5)", len(out.Items))
		}
	})

	t.Run("normal items capped at MaxNormal=5", func(t *testing.T) {
		// Create 7 normal items (score 40–59)
		queueItems := make([]domain.ReviewQueueItem, 7)
		for i := range queueItems {
			queueItems[i] = domain.ReviewQueueItem{
				UserID: "u1", WordID: fmt.Sprintf("norm-%d", i), PriorityScore: 50,
			}
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return queueItems, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			getStatsFn: func(_ context.Context, wordID string) (*domain.ReviewStats, error) {
				return makeReviewStats(wordID, 3, 0.5), nil
			},
			getLastReviewTypeFn: func(_ context.Context, _ string) (string, error) {
				return "", nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, reviewRepo, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(out.Items) != 5 {
			t.Errorf("session items = %d, want 5 (MaxNormal cap)", len(out.Items))
		}
	})

	t.Run("mixed critical and normal: critical items come first", func(t *testing.T) {
		queueItems := []domain.ReviewQueueItem{
			{UserID: "u1", WordID: "normal-1", PriorityScore: 50},
			{UserID: "u1", WordID: "critical-1", PriorityScore: 70},
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return queueItems, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			getStatsFn: func(_ context.Context, wordID string) (*domain.ReviewStats, error) {
				return makeReviewStats(wordID, 5, 0.8), nil
			},
			getLastReviewTypeFn: func(_ context.Context, _ string) (string, error) {
				return "", nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, reviewRepo, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(out.Items) != 2 {
			t.Fatalf("session items = %d, want 2", len(out.Items))
		}
		// Critical (score ≥ 60) should come first
		if out.Items[0].WordID != "critical-1" {
			t.Errorf("first item WordID = %q, want %q (critical first)", out.Items[0].WordID, "critical-1")
		}
		if out.Items[1].WordID != "normal-1" {
			t.Errorf("second item WordID = %q, want %q", out.Items[1].WordID, "normal-1")
		}
	})

	t.Run("output Total equals len(Items)", func(t *testing.T) {
		queueItems := []domain.ReviewQueueItem{
			{UserID: "u1", WordID: "w1", PriorityScore: 70},
			{UserID: "u1", WordID: "w2", PriorityScore: 50},
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return queueItems, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			getStatsFn: func(_ context.Context, wordID string) (*domain.ReviewStats, error) {
				return makeReviewStats(wordID, 5, 0.8), nil
			},
			getLastReviewTypeFn: func(_ context.Context, _ string) (string, error) {
				return "", nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, reviewRepo, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if out.Total != len(out.Items) {
			t.Errorf("Total = %d, len(Items) = %d; should be equal", out.Total, len(out.Items))
		}
	})

	t.Run("session items include enhanced reason combining queue reason and review reason", func(t *testing.T) {
		queueItems := []domain.ReviewQueueItem{
			{UserID: "u1", WordID: "w1", PriorityScore: 70, Reason: "Long time since last review"},
		}
		statsRepo := &mockWordStatsRepo{
			loadStatsFn: func(_ context.Context, _ string) ([]domain.WordStats, error) {
				return nil, nil
			},
		}
		queueRepo := &mockQueueRepo{
			rebuildFn: func(_ context.Context, _ string, _ []domain.ReviewQueueItem) error {
				return nil
			},
			getQueueItemsFn: func(_ context.Context, _ string) ([]domain.ReviewQueueItem, error) {
				return queueItems, nil
			},
		}
		reviewRepo := &mockReviewRepo{
			getStatsFn: func(_ context.Context, wordID string) (*domain.ReviewStats, error) {
				return makeReviewStats(wordID, 0, 0.0), nil
			},
			getLastReviewTypeFn: func(_ context.Context, _ string) (string, error) {
				return "", nil
			},
		}
		uc := NewSessionUseCase(queueRepo, statsRepo, reviewRepo, &mockWordRepo{}, &mockQuizRepo{})
		out, err := uc.StartSession(ctx, StartSessionInput{UserID: "u1"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(out.Items) == 0 {
			t.Fatal("expected items in session")
		}
		reason := out.Items[0].Reason
		if reason == "" {
			t.Error("session item Reason should not be empty")
		}
		// Reason should contain both the queue reason and review reason joined with ". "
		if len(reason) < len("Long time since last review") {
			t.Errorf("Reason %q too short, should include queue reason", reason)
		}
	})
}
