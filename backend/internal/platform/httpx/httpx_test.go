package httpx

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"endosoflow/internal/platform/apperr"
)

func quietLogger() *slog.Logger { return slog.New(slog.NewTextHandler(io.Discard, nil)) }

func decodeError(t *testing.T, body io.Reader) errorBody {
	t.Helper()
	var envelope errorEnvelope
	if err := json.NewDecoder(body).Decode(&envelope); err != nil {
		t.Fatalf("response is not the error envelope: %v", err)
	}
	return envelope.Error
}

func TestRequestIDGeneratesAndEchoesAnID(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if RequestIDFrom(r.Context()) == "" {
			t.Error("the handler must see a request id")
		}
	}))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Header().Get("X-Request-Id") == "" {
		t.Fatal("the response must carry X-Request-Id")
	}
}

func TestRequestIDKeepsAValidIncomingID(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-Id", "client-supplied-123")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if got := rec.Header().Get("X-Request-Id"); got != "client-supplied-123" {
		t.Fatalf("got %q", got)
	}
}

func TestRequestIDReplacesAnInvalidIncomingID(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-Id", "bad id with spaces & symbols")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	got := rec.Header().Get("X-Request-Id")
	if got == "" || strings.ContainsAny(got, " &") {
		t.Fatalf("got %q, want a freshly generated id", got)
	}
}

func TestWriteErrorUsesTheEnvelopeAndHidesInternals(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	WriteError(rec, req, quietLogger(), apperr.Internal(io.ErrUnexpectedEOF))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status %d", rec.Code)
	}
	body := decodeError(t, rec.Body)
	if body.Code != "INTERNAL_ERROR" || strings.Contains(body.Message, "EOF") {
		t.Fatalf("unexpected body: %+v", body)
	}
}

func TestWriteErrorIncludesFieldsAndTheRequestID(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := apperr.Unprocessable("VALIDATION_FAILED", "Datos inválidos.").
			WithFields(apperr.FieldError{Field: "vin", Code: "VIN_INVALID", Message: "VIN inválido."})
		WriteError(w, r, quietLogger(), err)
	}))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/", nil))

	body := decodeError(t, rec.Body)
	if len(body.Fields) != 1 || body.Fields[0].Field != "vin" {
		t.Fatalf("unexpected fields: %+v", body.Fields)
	}
	if body.RequestID == "" || body.RequestID != rec.Header().Get("X-Request-Id") {
		t.Fatalf("the body request id %q must match the header", body.RequestID)
	}
}

func TestRecoverTurnsAPanicInto500JSON(t *testing.T) {
	handler := Recover(quietLogger())(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status %d", rec.Code)
	}
	if body := decodeError(t, rec.Body); body.Code != "INTERNAL_ERROR" {
		t.Fatalf("unexpected body: %+v", body)
	}
}

func TestSecurityHeadersAreSet(t *testing.T) {
	handler := SecurityHeaders(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	for _, header := range []string{"X-Content-Type-Options", "X-Frame-Options", "Cache-Control", "Content-Security-Policy"} {
		if rec.Header().Get(header) == "" {
			t.Errorf("missing header %s", header)
		}
	}
}
