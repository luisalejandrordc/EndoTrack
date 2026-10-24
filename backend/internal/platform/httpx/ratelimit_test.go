package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiterAllowsUpToTheLimitThenBlocks(t *testing.T) {
	limiter := NewRateLimiter(3, time.Minute)
	now := time.Date(2026, 10, 19, 9, 0, 0, 0, time.UTC)
	limiter.now = func() time.Time { return now }

	for i := 0; i < 3; i++ {
		if allowed, _ := limiter.Allow("1.2.3.4"); !allowed {
			t.Fatalf("request %d must be allowed", i+1)
		}
	}
	allowed, retryAfter := limiter.Allow("1.2.3.4")
	if allowed || retryAfter <= 0 || retryAfter > time.Minute {
		t.Fatalf("the fourth request must be blocked (allowed=%v retryAfter=%v)", allowed, retryAfter)
	}
	if allowed, _ := limiter.Allow("5.6.7.8"); !allowed {
		t.Fatal("another key has its own allowance")
	}
}

func TestRateLimiterWindowResets(t *testing.T) {
	limiter := NewRateLimiter(1, time.Minute)
	now := time.Date(2026, 10, 19, 9, 0, 0, 0, time.UTC)
	limiter.now = func() time.Time { return now }

	limiter.Allow("k")
	if allowed, _ := limiter.Allow("k"); allowed {
		t.Fatal("must be blocked inside the window")
	}
	now = now.Add(time.Minute)
	if allowed, _ := limiter.Allow("k"); !allowed {
		t.Fatal("must be allowed again after the window")
	}
}

func TestRateLimiterMiddlewareAnswers429(t *testing.T) {
	limiter := NewRateLimiter(1, time.Minute)
	handler := limiter.Middleware(quietLogger(), false)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))

	call := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req.RemoteAddr = "9.9.9.9:1234"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}
	if rec := call(); rec.Code != http.StatusOK {
		t.Fatalf("first call: %d", rec.Code)
	}
	rec := call()
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("second call: %d, Retry-After %q", rec.Code, rec.Header().Get("Retry-After"))
	}
	if body := decodeError(t, rec.Body); body.Code != "RATE_LIMITED" {
		t.Fatalf("unexpected body %+v", body)
	}
}

func TestClientIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.1:5555"
	req.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.1")

	if got := ClientIP(req, false); got != "10.0.0.1" {
		t.Fatalf("without trust: got %q", got)
	}
	if got := ClientIP(req, true); got != "203.0.113.7" {
		t.Fatalf("with trust: got %q", got)
	}
}
