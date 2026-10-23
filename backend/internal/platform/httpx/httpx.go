// Package httpx holds the HTTP helpers shared by every module: JSON responses, the error
// envelope and the middleware that every request passes through.
package httpx

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"

	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/ids"
)

type ctxKey int

const requestIDKey ctxKey = 0

// RequestIDFrom returns the id of the request being handled, or "" outside a request.
func RequestIDFrom(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// WriteJSON writes v as a JSON response with the given status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code      string              `json:"code"`
	Message   string              `json:"message"`
	Fields    []apperr.FieldError `json:"fields,omitempty"`
	RequestID string              `json:"requestId,omitempty"`
}

// WriteError converts err into the standard error response. Server errors are logged with their
// underlying cause; the client only ever sees the stable code and the Spanish message.
func WriteError(w http.ResponseWriter, r *http.Request, logger *slog.Logger, err error) {
	appErr := apperr.FromError(err)
	if appErr == nil {
		appErr = apperr.Internal(errors.New("WriteError called with a nil error"))
	}
	requestID := RequestIDFrom(r.Context())
	if appErr.Status >= http.StatusInternalServerError {
		logger.Error("request failed", "code", appErr.Code, "request_id", requestID, "error", err)
	}
	WriteJSON(w, appErr.Status, errorEnvelope{Error: errorBody{
		Code:      appErr.Code,
		Message:   appErr.Message,
		Fields:    appErr.Fields,
		RequestID: requestID,
	}})
}

// RequestID gives every request an id (kept if the caller sent a sane X-Request-Id) and echoes it.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if !validRequestID(id) {
			id = ids.NewString()
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
	})
}

func validRequestID(id string) bool {
	if len(id) < 8 || len(id) > 64 {
		return false
	}
	for _, c := range id {
		isAllowed := (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_'
		if !isAllowed {
			return false
		}
	}
	return true
}

// Recover turns a panic in a handler into a 500 response instead of dropping the connection.
func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				recovered := recover()
				if recovered == nil {
					return
				}
				if recovered == http.ErrAbortHandler {
					panic(recovered)
				}
				logger.Error("panic in handler", "request_id", RequestIDFrom(r.Context()),
					"panic", fmt.Sprint(recovered), "stack", string(debug.Stack()))
				WriteError(w, r, logger, apperr.Internal(fmt.Errorf("panic: %v", recovered)))
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// AccessLog logs one line per request: method, path, status, size, duration and request id.
// Query strings, headers and bodies are deliberately left out.
func AccessLog(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			status := ww.Status()
			if status == 0 {
				status = http.StatusOK
			}
			logger.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", status,
				"bytes", ww.BytesWritten(),
				"duration_ms", time.Since(start).Milliseconds(),
				"request_id", RequestIDFrom(r.Context()))
		})
	}
}

// SecurityHeaders adds conservative headers suitable for a JSON API.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Cache-Control", "no-store")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		next.ServeHTTP(w, r)
	})
}
