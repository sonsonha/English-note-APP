package ai

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type explanation struct {
	Definition    string `json:"definition"`
	ExampleGood   string `json:"example_good"`
	PartOfSpeech  string `json:"part_of_speech"`
	CEFRLevel     string `json:"cefr_level"`
	VIMeaning     string `json:"vi_meaning"`
	Topic         string `json:"topic"`
	Pronunciation string `json:"pronunciation"`
}

type quiz struct {
	QuizType string   `json:"quiz_type"`
	Question string   `json:"question"`
	Choices  []string `json:"choices"`
	Answer   string   `json:"answer"`
}

type quizResponse struct {
	Quizzes []quiz `json:"quizzes"`
}

// ExplainWordSafe orchestrates prompt/response and validates the output.
func ExplainWordSafe(client Client, word, context string) (*domain.AIExplanation, error) {
	if client == nil {
		return nil, fmt.Errorf("ai client is nil")
	}

	content, err := client.ExplainWord(systemPrompt, buildUserPrompt(word, context))
	if err != nil {
		return nil, err
	}

	exp, err := parseExplanationJSON(content)
	if err != nil {
		return nil, err
	}

	if err := validateExplanation(exp); err != nil {
		return nil, err
	}

	return &domain.AIExplanation{
		Definition:    exp.Definition,
		ExampleGood:   exp.ExampleGood,
		PartOfSpeech:  exp.PartOfSpeech,
		CEFRLevel:     exp.CEFRLevel,
		VIMeaning:     exp.VIMeaning,
		Topic:         exp.Topic,
		Pronunciation: exp.Pronunciation,
	}, nil
}

// GenerateAllQuizzesSafe generates all 6 quiz levels for a word in a single AI call.
func GenerateAllQuizzesSafe(client Client, word, context string) ([]domain.AIQuiz, error) {
	if client == nil {
		return nil, fmt.Errorf("ai client is nil")
	}

	content, err := client.GenerateQuizzes(systemPromptAllQuizzes, buildUserPromptQuiz(word, context))
	if err != nil {
		return nil, err
	}

	quizzes, err := parseQuizzesJSON(content)
	if err != nil {
		return nil, err
	}

	if len(quizzes) == 0 {
		return nil, fmt.Errorf("no quizzes generated")
	}

	result := make([]domain.AIQuiz, 0, len(quizzes))
	for _, q := range quizzes {
		if err := validateQuiz(q); err != nil {
			continue
		}
		result = append(result, domain.AIQuiz{
			QuizType: q.QuizType,
			Question: q.Question,
			Choices:  q.Choices,
			Answer:   q.Answer,
		})
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("no valid quizzes after validation")
	}

	return result, nil
}

func parseExplanationJSON(content string) (explanation, error) {
	var exp explanation
	if err := json.Unmarshal([]byte(content), &exp); err == nil {
		return exp, nil
	}

	// Retry with trimmed JSON object if extra text exists.
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		trimmed := content[start : end+1]
		if err := json.Unmarshal([]byte(trimmed), &exp); err == nil {
			return exp, nil
		}
	}

	return exp, fmt.Errorf("invalid AI response JSON")
}

func parseQuizzesJSON(content string) ([]quiz, error) {
	// Try wrapped format: {"quizzes": [...]}
	var resp quizResponse
	if err := json.Unmarshal([]byte(content), &resp); err == nil && len(resp.Quizzes) > 0 {
		return resp.Quizzes, nil
	}

	// Retry with trimmed wrapper
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		trimmed := content[start : end+1]
		if err := json.Unmarshal([]byte(trimmed), &resp); err == nil && len(resp.Quizzes) > 0 {
			return resp.Quizzes, nil
		}
	}

	return nil, fmt.Errorf("invalid AI quiz response JSON")
}
