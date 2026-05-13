package http

import (
	"net/http"
	"time"

	"github.com/sonsonha/eng-noting/internal/usecase"
)

func (h *Handler) GetDailyStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "from and to are required")
		return
	}

	fromTime, err := time.Parse(time.DateOnly, from)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid from date")
		return
	}
	toTime, err := time.Parse(time.DateOnly, to)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid to date")
		return
	}

	input := usecase.GetCalendarStatsInput{
		UserID: userID,
		From:   fromTime,
		To:     toTime,
	}

	output, err := h.calendarStatsUseCase.GetCalendarStats(ctx, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get calendar stats")
		return
	}
	writeJSON(w, http.StatusOK, output)
}

func (h *Handler) BackfillDailyStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)

	if err := h.calendarStatsUseCase.BackfillDailyStats(ctx, usecase.BackfillDailyStatsInput{UserID: userID}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to backfill daily stats")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) GetCalendarSummaryStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := mustUserIDFromContext(ctx)
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if from == "" || to == "" {
		writeError(w, http.StatusBadRequest, "from and to are required")
		return
	}

	fromTime, err := time.Parse(time.DateOnly, from)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid from date")
		return
	}
	toTime, err := time.Parse(time.DateOnly, to)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid to date")
		return
	}

	input := usecase.CalendarSummaryStatsInput{
		UserID: userID,
		From:   fromTime,
		To:     toTime,
	}

	output, err := h.calendarStatsUseCase.GetCalendarSummaryStats(ctx, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get calendar summary stats")
		return
	}
	writeJSON(w, http.StatusOK, output)
}
