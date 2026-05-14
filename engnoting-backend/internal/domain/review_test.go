package domain

import "testing"

var mcqPool = map[string]bool{
	QuizTypeWordMeaningMCQ: true,
	QuizTypeContextFillMCQ: true,
	QuizTypePhraseMatch:    true,
	QuizTypeReverseMCQ:     true,
}

var fullPool = map[string]bool{
	QuizTypeWordMeaningMCQ: true,
	QuizTypeContextFillMCQ: true,
	QuizTypePhraseMatch:    true,
	QuizTypeReverseMCQ:     true,
	QuizTypeRecallTyping:   true,
	QuizTypeContextTyping:  true,
}

// assertPool runs SelectType n times and verifies every result is in the allowed set.
func assertPool(t *testing.T, ctx ReviewContext, allowed map[string]bool, n int) {
	t.Helper()
	for i := 0; i < n; i++ {
		got := SelectType(ctx)
		if !allowed[got] {
			t.Errorf("SelectType() = %q, not in allowed pool", got)
			return
		}
	}
}

func TestSelectType(t *testing.T) {
	const runs = 100

	t.Run("zero TotalReviews uses only MCQ pool", func(t *testing.T) {
		assertPool(t, ReviewContext{TotalReviews: 0, AccuracyRate: 0.9}, mcqPool, runs)
	})
	t.Run("low accuracy uses only MCQ pool", func(t *testing.T) {
		assertPool(t, ReviewContext{TotalReviews: 10, AccuracyRate: 0.49}, mcqPool, runs)
	})
	t.Run("accuracy below threshold uses only MCQ pool", func(t *testing.T) {
		assertPool(t, ReviewContext{TotalReviews: 5, AccuracyRate: 0.81}, mcqPool, runs)
	})
	t.Run("accuracy at 0.82 unlocks full pool", func(t *testing.T) {
		assertPool(t, ReviewContext{TotalReviews: 5, AccuracyRate: 0.82}, fullPool, runs)
	})
	t.Run("high accuracy uses full pool", func(t *testing.T) {
		assertPool(t, ReviewContext{TotalReviews: 100, AccuracyRate: 1.0}, fullPool, runs)
	})
}

func TestReason(t *testing.T) {
	ctx := ReviewContext{}

	tests := []struct {
		name       string
		reviewType string
		wantReason string
	}{
		{
			name:       "word_meaning_mcq reason",
			reviewType: QuizTypeWordMeaningMCQ,
			wantReason: "Starting with recognition: choose the Vietnamese meaning",
		},
		{
			name:       "context_fill_mcq reason",
			reviewType: QuizTypeContextFillMCQ,
			wantReason: "Building context: choose the word that fits the sentence",
		},
		{
			name:       "phrase_match reason",
			reviewType: QuizTypePhraseMatch,
			wantReason: "Deepening understanding: match the best phrase for this word",
		},
		{
			name:       "reverse_mcq reason",
			reviewType: QuizTypeReverseMCQ,
			wantReason: "Reversing direction: choose the English word from the Vietnamese meaning",
		},
		{
			name:       "recall_typing reason",
			reviewType: QuizTypeRecallTyping,
			wantReason: "Active recall: type the English word from its Vietnamese meaning",
		},
		{
			name:       "context_typing reason",
			reviewType: QuizTypeContextTyping,
			wantReason: "Full production: type the word into the sentence context",
		},
		{
			name:       "unknown type returns default reason",
			reviewType: "unknown",
			wantReason: "Default review format",
		},
		{
			name:       "empty type returns default reason",
			reviewType: "",
			wantReason: "Default review format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Reason(ctx, tt.reviewType)
			if got != tt.wantReason {
				t.Errorf("Reason() = %q, want %q", got, tt.wantReason)
			}
		})
	}
}
