package ai

import (
	"fmt"

	"github.com/sonsonha/eng-noting/internal/domain"
)

func validateExplanation(exp explanation) error {
	if exp.Definition == "" {
		return fmt.Errorf("missing definition")
	}
	if exp.ExampleGood == "" {
		return fmt.Errorf("missing example_good")
	}
	return nil
}

func validateQuiz(q quiz) error {
	if q.QuizType == "" {
		return fmt.Errorf("missing quiz_type")
	}
	if q.Question == "" {
		return fmt.Errorf("missing question")
	}
	if q.Answer == "" {
		return fmt.Errorf("missing answer")
	}
	switch q.QuizType {
	case domain.QuizTypeWordMeaningMCQ,
		domain.QuizTypeContextFillMCQ,
		domain.QuizTypePhraseMatch,
		domain.QuizTypeReverseMCQ:
		if len(q.Choices) < 2 {
			return fmt.Errorf("%s requires at least 2 choices", q.QuizType)
		}
	case domain.QuizTypeRecallTyping, domain.QuizTypeContextTyping:
		// typing quizzes have no choices
	default:
		return fmt.Errorf("unknown quiz_type: %s", q.QuizType)
	}
	return nil
}
