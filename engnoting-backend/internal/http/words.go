package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/sonsonha/eng-noting/internal/domain"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

type CreateWordRequest struct {
	Text    string `json:"text"`
	Context string `json:"context"`
}

type CreateWordResponse struct {
	WordID string `json:"word_id"`
}

type UpdateWordRequest struct {
	Text    string `json:"text"`
	Context string `json:"context"`
}

type UpdateWordResponse struct {
	WordID string `json:"word_id"`
}

type RegenerateWordRequest struct {
	Text    string `json:"text"`
	Context string `json:"context"`
}

type RegenerateWordResponse struct {
	WordID string `json:"word_id"`
}

type BackfillAIDataResponse struct {
	EnqueuedVIMeaning int `json:"enqueued_vi_meaning"`
	EnqueuedQuizzes   int `json:"enqueued_quizzes"`
}

func (h *Handler) BackfillAIData(w http.ResponseWriter, r *http.Request) {
	out, err := h.wordUseCase.BackfillAIData(r.Context())
	if err != nil {
		h.logger.Error("backfill failed", "err", err)
		writeError(w, http.StatusInternalServerError, "backfill failed")
		return
	}
	writeJSON(w, http.StatusOK, BackfillAIDataResponse{
		EnqueuedVIMeaning: out.EnqueuedVIMeaning,
		EnqueuedQuizzes:   out.EnqueuedQuizzes,
	})
}

func (h *Handler) RegenerateWord(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	wordID := r.PathValue("id")
	if wordID == "" {
		writeError(w, http.StatusBadRequest, "missing word ID")
		return
	}

	var req RegenerateWordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.Text == "" {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}

	// if req.Context == "" {
	// 	writeError(w, http.StatusBadRequest, "context is required")
	// 	return
	// }

	input := usecase.RegenerateWordInput{
		WordID:  wordID,
		UserID:  userID,
		Text:    req.Text,
		Context: req.Context,
	}

	output, err := h.wordUseCase.RegenerateWord(ctx, input)
	if err != nil {
		h.logger.Error("failed to generate word", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to generate word")
		return
	}

	resp := RegenerateWordResponse{WordID: output.WordID}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreateWord(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	var req CreateWordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	if req.Text == "" {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}

	input := usecase.CreateWordInput{
		UserID:  userID,
		Text:    req.Text,
		Context: req.Context,
	}

	output, err := h.wordUseCase.CreateWord(ctx, input)
	if err != nil {
		if errors.Is(err, domain.ErrWordAlreadyExists) {
			writeError(w, http.StatusConflict, "you already have this word")
			return
		}
		if errors.Is(err, domain.ErrUserNotFound) {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		if errors.Is(err, domain.ErrBadRequest) {
			writeError(w, http.StatusBadRequest, "bad request")
			return
		}
		h.logger.Error("failed to create word", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to save word")
		return
	}

	resp := CreateWordResponse{WordID: output.WordID}
	writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) UpdateWord(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	wordID := r.PathValue("id")
	if wordID == "" {
		writeError(w, http.StatusBadRequest, "missing word ID")
		return
	}
	var req UpdateWordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	input := usecase.UpdateWordInput{
		WordID:  wordID,
		UserID:  userID,
		Text:    req.Text,
		Context: req.Context,
	}
	output, err := h.wordUseCase.UpdateWord(ctx, input)
	if err != nil {
		if errors.Is(err, domain.ErrWordAlreadyExists) {
			writeError(w, http.StatusConflict, "you already have this word")
			return
		}
		if errors.Is(err, domain.ErrWordNotFound) {
			writeError(w, http.StatusNotFound, "word not found")
			return
		}
		if errors.Is(err, domain.ErrBadRequest) {
			writeError(w, http.StatusBadRequest, "bad request")
			return
		}
		h.logger.Error("failed to update word", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to update word")
		return
	}

	resp := UpdateWordResponse{WordID: output.WordID}
	writeJSON(w, http.StatusOK, resp)
}

type WordResponse struct {
	ID           string  `json:"id"`
	Text         string  `json:"text"`
	Context      *string `json:"context,omitempty"`
	Source       *string `json:"source,omitempty"`
	Confidence   *int    `json:"confidence,omitempty"`
	CreatedAt    string  `json:"created_at"`
	Definition   *string `json:"definition,omitempty"`
	ExampleGood  *string `json:"example_good,omitempty"`
	PartOfSpeech *string `json:"part_of_speech,omitempty"`
	CEFRLevel    *string `json:"cefr_level,omitempty"`
	VIMeaning    *string `json:"vi_meaning,omitempty"`
	Topic        *string `json:"topic,omitempty"`
}

func (h *Handler) GetWord(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	wordID := r.PathValue("id")
	if wordID == "" {
		writeError(w, http.StatusBadRequest, "missing word ID")
		return
	}

	input := usecase.GetWordInput{
		WordID: wordID,
		UserID: userID,
	}

	output, err := h.wordUseCase.GetWord(ctx, input)
	if err != nil {
		if errors.Is(err, domain.ErrWordNotFound) {
			writeError(w, http.StatusNotFound, "word not found")
			return
		}
		if errors.Is(err, domain.ErrBadRequest) {
			writeError(w, http.StatusBadRequest, "bad request")
			return
		}
		h.logger.Error("failed to get word", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to get word")
		return
	}

	word := output.Word
	resp := WordResponse{
		ID:         word.ID,
		Text:       word.Text,
		Context:    word.Context,
		Source:     word.Source,
		Confidence: word.Confidence,
		CreatedAt:  word.CreatedAt.Format(time.RFC3339),
	}

	if word.AIData != nil {
		resp.Definition = &word.AIData.Definition
		resp.ExampleGood = &word.AIData.ExampleGood
		resp.PartOfSpeech = word.AIData.PartOfSpeech
		resp.CEFRLevel = word.AIData.CEFRLevel
		resp.VIMeaning = word.AIData.VIMeaning
		resp.Topic = word.AIData.Topic
	}

	writeJSON(w, http.StatusOK, resp)
}

type ListWordsResponse struct {
	Words []WordResponse `json:"words"`
	Total int            `json:"total"`
}

func (h *Handler) ListWords(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	const maxLimit = 200

	// Parse pagination parameters
	limit := 50
	offset := 0
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	input := usecase.ListWordsInput{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	}

	output, err := h.wordUseCase.ListWords(ctx, input)
	if err != nil {
		h.logger.Error("failed to list words", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to list words")
		return
	}

	words := make([]WordResponse, len(output.Words))
	for i, word := range output.Words {
		words[i] = WordResponse{
			ID:         word.ID,
			Text:       word.Text,
			Context:    word.Context,
			Source:     word.Source,
			Confidence: word.Confidence,
			CreatedAt:  word.CreatedAt.Format(time.RFC3339),
		}

		if word.AIData != nil {
			words[i].Definition = &word.AIData.Definition
			words[i].ExampleGood = &word.AIData.ExampleGood
			words[i].PartOfSpeech = word.AIData.PartOfSpeech
			words[i].CEFRLevel = word.AIData.CEFRLevel
			words[i].VIMeaning = word.AIData.VIMeaning
			words[i].Topic = word.AIData.Topic
		}
	}

	writeJSON(w, http.StatusOK, ListWordsResponse{
		Words: words,
		Total: output.Total,
	})
}
