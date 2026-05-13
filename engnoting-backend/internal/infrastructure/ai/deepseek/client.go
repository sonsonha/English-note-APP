package deepseek

import (
	"context"
	"fmt"
	"strings"

	openai "github.com/sashabaranov/go-openai"
	infraai "github.com/sonsonha/eng-noting/internal/infrastructure/ai"
)

const (
	baseURL = "https://api.deepseek.com"
	model   = "deepseek-chat"
)

type Client struct {
	client *openai.Client
}

func NewClient(apiKey string) *Client {
	if apiKey == "" {
		return nil
	}
	cfg := openai.DefaultConfig(apiKey)
	cfg.BaseURL = baseURL
	return &Client{
		client: openai.NewClientWithConfig(cfg),
	}
}

func (c *Client) ExplainWord(systemPrompt, userPrompt string) (string, error) {
	if c == nil || c.client == nil {
		return "", fmt.Errorf("DeepSeek client not initialized")
	}

	resp, err := c.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: model,
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
				{Role: openai.ChatMessageRoleUser, Content: userPrompt},
			},
			ResponseFormat: &openai.ChatCompletionResponseFormat{
				Type: openai.ChatCompletionResponseFormatTypeJSONObject,
			},
			Temperature: 0.3,
		},
	)
	if err != nil {
		return "", fmt.Errorf("DeepSeek API error: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from DeepSeek")
	}
	return strings.TrimSpace(resp.Choices[0].Message.Content), nil
}

func (c *Client) GenerateQuizzes(systemPrompt, userPrompt string) (string, error) {
	if c == nil || c.client == nil {
		return "", fmt.Errorf("DeepSeek client not initialized")
	}

	resp, err := c.client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: model,
			Messages: []openai.ChatCompletionMessage{
				{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
				{Role: openai.ChatMessageRoleUser, Content: userPrompt},
			},
			ResponseFormat: &openai.ChatCompletionResponseFormat{
				Type: openai.ChatCompletionResponseFormatTypeJSONObject,
			},
			Temperature: 0.5,
		},
	)
	if err != nil {
		return "", fmt.Errorf("DeepSeek API error: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("empty response from DeepSeek")
	}
	return strings.TrimSpace(resp.Choices[0].Message.Content), nil
}

var _ infraai.Client = (*Client)(nil)
