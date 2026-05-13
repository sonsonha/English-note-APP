package http

import (
	"errors"
	"net/http"

	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

type QuizResponse struct {
	QuizType    string   `json:"quiz_type"`
	Question    string   `json:"question"`
	Choices     []string `json:"choices"`
	Answer      string   `json:"answer"`
	GeneratedAt string   `json:"generated_at"`
}

func (h *Handler) GetQuizzesByWordID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)
	wordID := r.PathValue("id")
	if wordID == "" {
		writeError(w, http.StatusBadRequest, "missing word ID")
		return
	}

	output, err := h.wordQuizUseCase.GetQuizzesByWordID(ctx, usecase.GetQuizzesInput{
		UserID:   userID,
		WordID:   wordID,
		QuizType: r.URL.Query().Get("type"),
	})
	if err != nil {
		if errors.Is(err, domain.ErrWordNotFound) {
			writeError(w, http.StatusNotFound, "word not found")
			return
		}
		h.logger.Error("failed to get quizzes", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to get quizzes")
		return
	}

	resp := make([]QuizResponse, len(output.Quizzes))
	for i, q := range output.Quizzes {
		choices := q.Choices
		if choices == nil {
			choices = []string{}
		}
		resp[i] = QuizResponse{
			QuizType:    q.QuizType,
			Question:    q.Question,
			Choices:     choices,
			Answer:      q.Answer,
			GeneratedAt: q.GeneratedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
