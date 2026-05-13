package domain

// AIExplanation represents AI-generated information for a word.
type AIExplanation struct {
	Definition   string
	ExampleGood  string
	PartOfSpeech string
	CEFRLevel    string
}

// AIQuiz represents a single AI-generated quiz item.
type AIQuiz struct {
	QuizType string
	Question string
	Choices  []string
	Answer   string
}

// AIService defines behavior for generating AI content.
type AIService interface {
	ExplainWord(word, context string) (*AIExplanation, error)
	GenerateInitialQuizzes(word, context string) ([]AIQuiz, error)
	GenerateAdvancedQuizzes(word, context string) ([]AIQuiz, error)
}
