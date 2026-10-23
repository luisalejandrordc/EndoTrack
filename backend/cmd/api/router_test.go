package main

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type okPinger struct{}

func (okPinger) Ping(context.Context) error { return nil }

func serve(method, path string) *httptest.ResponseRecorder {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	rec := httptest.NewRecorder()
	newRouter(logger, okPinger{}).ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestHealthRoute(t *testing.T) {
	rec := serve(http.MethodGet, "/api/v1/health")
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	if rec.Header().Get("X-Request-Id") == "" {
		t.Fatal("every response must carry a request id")
	}
}

func TestUnknownRouteUsesTheErrorEnvelope(t *testing.T) {
	rec := serve(http.MethodGet, "/api/v1/nope")
	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), "ROUTE_NOT_FOUND") {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}

func TestWrongMethodUsesTheErrorEnvelope(t *testing.T) {
	rec := serve(http.MethodPost, "/api/v1/health")
	if rec.Code != http.StatusMethodNotAllowed || !strings.Contains(rec.Body.String(), "METHOD_NOT_ALLOWED") {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
}
