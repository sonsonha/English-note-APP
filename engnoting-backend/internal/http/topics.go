package http

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/sonsonha/eng-noting/internal/usecase"
)

type TopicSummaryResponse struct {
	Topic     string `json:"topic"`
	WordCount int    `json:"word_count"`
}

type GetTopicsResponse struct {
	Topics []TopicSummaryResponse `json:"topics"`
}

func (h *Handler) GetTopics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	output, err := h.topicUseCase.GetTopics(ctx, usecase.GetTopicsInput{UserID: userID})
	if err != nil {
		h.logger.Error("failed to get topics", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to get topics")
		return
	}

	topics := make([]TopicSummaryResponse, len(output.Topics))
	for i, t := range output.Topics {
		topics[i] = TopicSummaryResponse{Topic: t.Topic, WordCount: t.WordCount}
	}

	writeJSON(w, http.StatusOK, GetTopicsResponse{Topics: topics})
}

type GetTopicWordsResponse struct {
	Topic string         `json:"topic"`
	Words []WordResponse `json:"words"`
}

func (h *Handler) GetTopicWords(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	topic := chi.URLParam(r, "topic")
	if topic == "" {
		writeError(w, http.StatusBadRequest, "missing topic")
		return
	}

	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	output, err := h.topicUseCase.GetTopicWords(ctx, usecase.GetTopicWordsInput{
		UserID: userID,
		Topic:  topic,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		h.logger.Error("failed to get topic words", "err", err)
		writeError(w, http.StatusInternalServerError, "failed to get topic words")
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
			CreatedAt:  word.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
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

	writeJSON(w, http.StatusOK, GetTopicWordsResponse{Topic: topic, Words: words})
}
