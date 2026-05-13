package gemini

import (
	"context"
	"fmt"
	"strings"

	"google.golang.org/genai"

	infraai "github.com/sonsonha/eng-noting/internal/infrastructure/ai"
)

type Client struct {
	client *genai.Client
	model  string
}

func NewClient(apiKey string) *Client {
	if apiKey == "" {
		return nil
	}
	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil
	}
	return &Client{
		client: client,
		model:  "gemini-2.5-flash",
	}
}

func (c *Client) ExplainWord(systemPrompt, userPrompt string) (string, error) {
	if c == nil || c.client == nil {
		return "", fmt.Errorf("Gemini client not initialized")
	}

	ctx := context.Background()
	resp, err := c.client.Models.GenerateContent(ctx, c.model, []*genai.Content{genai.NewContentFromText(userPrompt, genai.RoleUser)}, &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(systemPrompt, genai.RoleUser),
		Temperature:       genai.Ptr[float32](0.3),
		ResponseMIMEType:  "application/json",
	})
	if err != nil {
		return "", fmt.Errorf("Gemini API error: %w", err)
	}

	if resp == nil || len(resp.Candidates) == 0 {
		return "", fmt.Errorf("empty response from Gemini")
	}

	content := strings.TrimSpace(resp.Text())
	return content, nil
}

func (c *Client) GenerateQuizzes(systemPrompt, userPrompt string) (string, error) {
	return c.ExplainWord(systemPrompt, userPrompt)
}

var _ infraai.Client = (*Client)(nil)
