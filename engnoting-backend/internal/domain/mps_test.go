package domain

import (
	"testing"
	"time"
)

func intPtr(i int) *int { return &i }

func timePtr(t time.Time) *time.Time { return &t }

func TestCalculateMPS(t *testing.T) {
	tests := []struct {
		name         string
		stat         WordStats
		wantMinScore float64
		wantMaxScore float64
		wantReason   string
	}{
		{
			name: "nil LastReviewedAt gives max time factor (30 days)",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: nil,
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 29.9,
			wantMaxScore: 30.1,
			wantReason:   "Long time since last review",
		},
		{
			name: "future LastReviewedAt clamps days to 0",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now().Add(48 * time.Hour)),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 0,
			wantMaxScore: 0.1,
			wantReason:   "Long time since last review",
		},
		{
			name: "AccuracyRate 0.0 gives max accuracy factor",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   0.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 29.9,
			wantMaxScore: 30.1,
			wantReason:   "Low accuracy rate",
		},
		{
			name: "AccuracyRate 1.0 gives zero accuracy factor",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 0,
			wantMaxScore: 0.1,
			wantReason:   "Long time since last review",
		},
		{
			name: "nil Confidence defaults to factor 0.5 (contributes 7.5 points)",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     nil,
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 7.4,
			wantMaxScore: 7.6,
			wantReason:   "Low confidence",
		},
		{
			name: "Confidence 5 gives zero confidence factor",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 0,
			wantMaxScore: 0.1,
			wantReason:   "Long time since last review",
		},
		{
			name: "Confidence 0 gives max confidence factor (contributes 15 points)",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(0),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 14.9,
			wantMaxScore: 15.1,
			wantReason:   "Low confidence",
		},
		{
			name: "RecentReviews 0 gives zero failure factor (no division by zero)",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				RecentFailures: 5,
				FrequencyScore: 0,
			},
			wantMinScore: 0,
			wantMaxScore: 0.1,
			wantReason:   "Long time since last review",
		},
		{
			name: "all failures gives max failure factor (contributes 15 points)",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  3,
				RecentFailures: 3,
				FrequencyScore: 0,
			},
			wantMinScore: 14.9,
			wantMaxScore: 15.1,
			wantReason:   "Recent failures",
		},
		{
			name: "FrequencyScore 1.0 contributes 10 points and wins as reason",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 1.0,
			},
			wantMinScore: 9.9,
			wantMaxScore: 10.1,
			wantReason:   "High frequency word",
		},
		{
			name: "score is clamped to 100 when all factors are max",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: nil,
				AccuracyRate:   0.0,
				Confidence:     intPtr(0),
				RecentReviews:  10,
				RecentFailures: 10,
				FrequencyScore: 1.0,
			},
			wantMinScore: 99.9,
			wantMaxScore: 100,
			wantReason:   "Long time since last review",
		},
		{
			name: "score is clamped to 0 when all factors are zero",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 0,
			wantMaxScore: 0.1,
			wantReason:   "Long time since last review",
		},
		{
			name: "low accuracy wins over time factor",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now().Add(-5 * 24 * time.Hour)), // 5 days ago → timeFactor ~0.167
				AccuracyRate:   0.0,                                          // accuracyFactor = 1.0
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 30,
			wantMaxScore: 40,
			wantReason:   "Low accuracy rate",
		},
		{
			name: "partial failure factor reason",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   1.0,
				Confidence:     intPtr(5),
				RecentReviews:  4,
				RecentFailures: 3,
				FrequencyScore: 0,
			},
			wantMinScore: 11,
			wantMaxScore: 12,
			wantReason:   "Recent failures",
		},
		{
			name: "AccuracyRate out-of-range > 1.0 is clamped",
			stat: WordStats{
				WordID:         "w1",
				LastReviewedAt: timePtr(time.Now()),
				AccuracyRate:   2.0,
				Confidence:     intPtr(5),
				RecentReviews:  0,
				FrequencyScore: 0,
			},
			wantMinScore: 0,
			wantMaxScore: 0.1,
			wantReason:   "Long time since last review",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score, reason := CalculateMPS(tt.stat)

			if score < tt.wantMinScore || score > tt.wantMaxScore {
				t.Errorf("CalculateMPS() score = %v, want in [%v, %v]", score, tt.wantMinScore, tt.wantMaxScore)
			}
			if reason != tt.wantReason {
				t.Errorf("CalculateMPS() reason = %q, want %q", reason, tt.wantReason)
			}
		})
	}
}

func TestCalculateMPS_ScoreWeights(t *testing.T) {
	// Verify individual factor contributions via known inputs.
	// All factors zero except the one under test.

	t.Run("time factor contributes up to 30 points", func(t *testing.T) {
		stat := WordStats{
			LastReviewedAt: nil, // 30 days → timeFactor = 1.0
			AccuracyRate:   1.0,
			Confidence:     intPtr(5),
			RecentReviews:  0,
			FrequencyScore: 0,
		}
		score, _ := CalculateMPS(stat)
		if score < 29.9 || score > 30.1 {
			t.Errorf("expected score ~30, got %v", score)
		}
	})

	t.Run("accuracy factor contributes up to 30 points", func(t *testing.T) {
		stat := WordStats{
			LastReviewedAt: timePtr(time.Now()),
			AccuracyRate:   0.0,
			Confidence:     intPtr(5),
			RecentReviews:  0,
			FrequencyScore: 0,
		}
		score, _ := CalculateMPS(stat)
		if score < 29.9 || score > 30.1 {
			t.Errorf("expected score ~30, got %v", score)
		}
	})

	t.Run("confidence factor contributes up to 15 points", func(t *testing.T) {
		stat := WordStats{
			LastReviewedAt: timePtr(time.Now()),
			AccuracyRate:   1.0,
			Confidence:     intPtr(0),
			RecentReviews:  0,
			FrequencyScore: 0,
		}
		score, _ := CalculateMPS(stat)
		if score < 14.9 || score > 15.1 {
			t.Errorf("expected score ~15, got %v", score)
		}
	})

	t.Run("failure factor contributes up to 15 points", func(t *testing.T) {
		stat := WordStats{
			LastReviewedAt: timePtr(time.Now()),
			AccuracyRate:   1.0,
			Confidence:     intPtr(5),
			RecentReviews:  1,
			RecentFailures: 1,
			FrequencyScore: 0,
		}
		score, _ := CalculateMPS(stat)
		if score < 14.9 || score > 15.1 {
			t.Errorf("expected score ~15, got %v", score)
		}
	})

	t.Run("frequency factor contributes up to 10 points", func(t *testing.T) {
		stat := WordStats{
			LastReviewedAt: timePtr(time.Now()),
			AccuracyRate:   1.0,
			Confidence:     intPtr(5),
			RecentReviews:  0,
			FrequencyScore: 1.0,
		}
		score, _ := CalculateMPS(stat)
		if score < 9.9 || score > 10.1 {
			t.Errorf("expected score ~10, got %v", score)
		}
	})
}
