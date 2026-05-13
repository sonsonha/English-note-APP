package ai

// Client is a low-level interface for AI providers.
type Client interface {
	ExplainWord(systemPrompt, userPrompt string) (string, error)
	GenerateQuizzes(systemPrompt, userPrompt string) (string, error)
}
