package ai

import "fmt"

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
	case "mcq", "match":
		if len(q.Choices) < 2 {
			return fmt.Errorf("mcq/match requires at least 2 choices")
		}
	}
	return nil
}
