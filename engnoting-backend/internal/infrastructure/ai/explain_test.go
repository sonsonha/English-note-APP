package ai

import (
	"errors"
	"testing"
)

// mockAIClient implements Client for testing.
type mockAIClient struct {
	explainWordFn func(systemPrompt, userPrompt string) (string, error)
}

func (m *mockAIClient) ExplainWord(systemPrompt, userPrompt string) (string, error) {
	return m.explainWordFn(systemPrompt, userPrompt)
}

func (m *mockAIClient) GenerateQuizzes(systemPrompt, userPrompt string) (string, error) {
	return "", nil
}

func TestExplainWordSafe(t *testing.T) {
	validJSON := `{"definition":"A test word","example_good":"This is a test.","part_of_speech":"noun","cefr_level":"B1"}`

	tests := []struct {
		name      string
		client    Client
		word      string
		context   string
		wantErr   bool
		wantErrIs string
		wantDef   string
	}{
		{
			name:      "nil client returns error",
			client:    nil,
			word:      "test",
			context:   "",
			wantErr:   true,
			wantErrIs: "ai client is nil",
		},
		{
			name: "client returns error",
			client: &mockAIClient{
				explainWordFn: func(_, _ string) (string, error) {
					return "", errors.New("network error")
				},
			},
			word:    "test",
			context: "",
			wantErr: true,
		},
		{
			name: "client returns invalid JSON",
			client: &mockAIClient{
				explainWordFn: func(_, _ string) (string, error) {
					return "not json at all", nil
				},
			},
			word:    "test",
			context: "",
			wantErr: true,
		},
		{
			name: "client returns JSON wrapped in extra text",
			client: &mockAIClient{
				explainWordFn: func(_, _ string) (string, error) {
					return "Here is your response: " + validJSON + " Hope that helps!", nil
				},
			},
			word:    "test",
			context: "",
			wantErr: false,
			wantDef: "A test word",
		},
		{
			name: "valid JSON missing definition returns validation error",
			client: &mockAIClient{
				explainWordFn: func(_, _ string) (string, error) {
					return `{"example_good":"This is a test."}`, nil
				},
			},
			word:    "test",
			context: "",
			wantErr: true,
		},
		{
			name: "valid JSON missing example_good returns validation error",
			client: &mockAIClient{
				explainWordFn: func(_, _ string) (string, error) {
					return `{"definition":"A word."}`, nil
				},
			},
			word:    "test",
			context: "",
			wantErr: true,
		},
		{
			name: "valid JSON with all required fields returns explanation",
			client: &mockAIClient{
				explainWordFn: func(_, _ string) (string, error) {
					return validJSON, nil
				},
			},
			word:    "test",
			context: "in a school setting",
			wantErr: false,
			wantDef: "A test word",
		},
		{
			name: "valid JSON with only required fields succeeds",
			client: &mockAIClient{
				explainWordFn: func(_, _ string) (string, error) {
					return `{"definition":"Minimal def","example_good":"A good example."}`, nil
				},
			},
			word:    "min",
			context: "",
			wantErr: false,
			wantDef: "Minimal def",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ExplainWordSafe(tt.client, tt.word, tt.context)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ExplainWordSafe() expected error, got nil")
				}
				if tt.wantErrIs != "" && err.Error() != tt.wantErrIs {
					t.Errorf("ExplainWordSafe() error = %q, want %q", err.Error(), tt.wantErrIs)
				}
				return
			}
			if err != nil {
				t.Fatalf("ExplainWordSafe() unexpected error: %v", err)
			}
			if got == nil {
				t.Fatal("ExplainWordSafe() returned nil, want explanation")
			}
			if got.Definition != tt.wantDef {
				t.Errorf("Definition = %q, want %q", got.Definition, tt.wantDef)
			}
		})
	}
}

func TestExplainWordSafe_PassesPromptsToClient(t *testing.T) {
	var capturedSystem, capturedUser string
	client := &mockAIClient{
		explainWordFn: func(sys, usr string) (string, error) {
			capturedSystem = sys
			capturedUser = usr
			return `{"definition":"def","example_good":"ex"}`, nil
		},
	}

	_, err := ExplainWordSafe(client, "hello", "greeting context")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if capturedSystem != systemPrompt {
		t.Errorf("system prompt = %q, want %q", capturedSystem, systemPrompt)
	}

	expectedUser := buildUserPrompt("hello", "greeting context")
	if capturedUser != expectedUser {
		t.Errorf("user prompt = %q, want %q", capturedUser, expectedUser)
	}
}

func TestParseExplanationJSON(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantDef string
		wantErr bool
	}{
		{
			name:    "clean JSON parses correctly",
			input:   `{"definition":"Hello","example_good":"Hi there."}`,
			wantDef: "Hello",
			wantErr: false,
		},
		{
			name:    "JSON with prefix and suffix is trimmed",
			input:   `Some text before {"definition":"Trimmed","example_good":"Yes."} and after`,
			wantDef: "Trimmed",
			wantErr: false,
		},
		{
			name:    "completely invalid content returns error",
			input:   "no braces here at all",
			wantErr: true,
		},
		{
			name:    "empty string returns error",
			input:   "",
			wantErr: true,
		},
		{
			name:    "only opening brace returns error",
			input:   "{",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseExplanationJSON(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("parseExplanationJSON() expected error, got nil (result: %+v)", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("parseExplanationJSON() unexpected error: %v", err)
			}
			if got.Definition != tt.wantDef {
				t.Errorf("Definition = %q, want %q", got.Definition, tt.wantDef)
			}
		})
	}
}

func TestValidateExplanation(t *testing.T) {
	tests := []struct {
		name    string
		exp     explanation
		wantErr bool
	}{
		{
			name:    "valid explanation passes",
			exp:     explanation{Definition: "def", ExampleGood: "ex"},
			wantErr: false,
		},
		{
			name:    "missing definition returns error",
			exp:     explanation{ExampleGood: "ex"},
			wantErr: true,
		},
		{
			name:    "missing example_good returns error",
			exp:     explanation{Definition: "def"},
			wantErr: true,
		},
		{
			name:    "both missing returns error",
			exp:     explanation{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateExplanation(tt.exp)
			if tt.wantErr && err == nil {
				t.Errorf("validateExplanation() expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Errorf("validateExplanation() unexpected error: %v", err)
			}
		})
	}
}

func TestBuildUserPrompt(t *testing.T) {
	tests := []struct {
		name    string
		word    string
		context string
		wantCtx bool
	}{
		{
			name:    "empty context omits context line",
			word:    "hello",
			context: "",
			wantCtx: false,
		},
		{
			name:    "non-empty context includes context line",
			word:    "hello",
			context: "a greeting",
			wantCtx: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildUserPrompt(tt.word, tt.context)
			if got == "" {
				t.Error("buildUserPrompt() returned empty string")
			}
			hasWord := len(got) > 0 && containsSubstr(got, tt.word)
			if !hasWord {
				t.Errorf("prompt %q does not contain word %q", got, tt.word)
			}
			hasCtx := containsSubstr(got, tt.context)
			if tt.wantCtx && !hasCtx {
				t.Errorf("prompt %q does not contain context %q", got, tt.context)
			}
			if !tt.wantCtx && tt.context != "" && hasCtx {
				t.Errorf("prompt %q unexpectedly contains context %q", got, tt.context)
			}
		})
	}
}

func containsSubstr(s, sub string) bool {
	if sub == "" {
		return false
	}
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && findSubstr(s, sub))
}

func findSubstr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
