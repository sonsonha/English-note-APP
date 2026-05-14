package domain

import "testing"

func TestSelectType(t *testing.T) {
	tests := []struct {
		name     string
		ctx      ReviewContext
		wantType string
	}{
		{
			name:     "zero TotalReviews returns word_meaning_mcq",
			ctx:      ReviewContext{TotalReviews: 0, AccuracyRate: 0.9},
			wantType: QuizTypeWordMeaningMCQ,
		},
		{
			name:     "AccuracyRate below 0.5 returns word_meaning_mcq",
			ctx:      ReviewContext{TotalReviews: 10, AccuracyRate: 0.49},
			wantType: QuizTypeWordMeaningMCQ,
		},
		{
			name:     "AccuracyRate exactly 0.0 returns word_meaning_mcq",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.0},
			wantType: QuizTypeWordMeaningMCQ,
		},
		{
			name:     "AccuracyRate 0.50 returns context_fill_mcq",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.50},
			wantType: QuizTypeContextFillMCQ,
		},
		{
			name:     "AccuracyRate 0.60 returns context_fill_mcq",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.60},
			wantType: QuizTypeContextFillMCQ,
		},
		{
			name:     "AccuracyRate 0.62 returns phrase_match",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.62},
			wantType: QuizTypePhraseMatch,
		},
		{
			name:     "AccuracyRate 0.70 returns phrase_match",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.70},
			wantType: QuizTypePhraseMatch,
		},
		{
			name:     "AccuracyRate 0.72 returns reverse_mcq",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.72},
			wantType: QuizTypeReverseMCQ,
		},
		{
			name:     "AccuracyRate 0.80 returns reverse_mcq",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.80},
			wantType: QuizTypeReverseMCQ,
		},
		{
			name:     "AccuracyRate 0.82 returns recall_typing",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.82},
			wantType: QuizTypeRecallTyping,
		},
		{
			name:     "AccuracyRate 0.90 returns recall_typing (boundary, exclusive)",
			ctx:      ReviewContext{TotalReviews: 5, AccuracyRate: 0.90},
			wantType: QuizTypeRecallTyping,
		},
		{
			name:     "AccuracyRate 0.92 returns context_typing",
			ctx:      ReviewContext{TotalReviews: 10, AccuracyRate: 0.92},
			wantType: QuizTypeContextTyping,
		},
		{
			name:     "AccuracyRate 1.0 returns context_typing",
			ctx:      ReviewContext{TotalReviews: 100, AccuracyRate: 1.0},
			wantType: QuizTypeContextTyping,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SelectType(tt.ctx)
			if got != tt.wantType {
				t.Errorf("SelectType() = %q, want %q", got, tt.wantType)
			}
		})
	}
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
