package auth

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func newTestRouter(env *testEnv) http.Handler {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := NewHandler(env.svc, logger, HandlerConfig{AppBaseURL: "http://app.test", CookieSecure: false})

	r := chi.NewRouter()
	r.Route("/api/v1", func(r chi.Router) {
		handler.Mount(r)
		r.With(handler.Authenticate, RequireRoles(logger, RoleSalesManager)).
			Get("/managers-only", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	})
	return r
}

func send(router http.Handler, method, path, body string, headers map[string]string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func loginBody(emp testEmployee, password string, remember bool) string {
	return `{"documentType":"` + emp.DocType + `","documentNumber":"` + emp.DocNumber +
		`","password":"` + password + `","rememberMe":` + map[bool]string{true: "true", false: "false"}[remember] + `}`
}

func refreshCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == refreshCookieName {
			return cookie
		}
	}
	t.Fatal("the response did not set the refresh cookie")
	return nil
}

func TestLoginSetsAnHttpOnlyStrictCookieAndReturnsAnAccessToken(t *testing.T) {
	env := newTestEnv(t)
	emp := env.createEmployee(t, RoleSalesAdvisor, goodPassword)
	router := newTestRouter(env)

	rec := send(router, http.MethodPost, "/api/v1/auth/employee/login", loginBody(emp, goodPassword, true), nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d: %s", rec.Code, rec.Body.String())
	}
	cookie := refreshCookie(t, rec)
	if !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode || cookie.Path != "/api/v1/auth" || cookie.MaxAge <= 0 {
		t.Fatalf("unexpected cookie attributes: %+v", cookie)
	}
	var body struct {
		AccessToken string `json:"accessToken"`
		Employee    struct {
			DocumentNumber string `json:"documentNumber"`
			Role           string `json:"role"`
		} `json:"employee"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.AccessToken == "" ||
		body.Employee.DocumentNumber != emp.DocNumber || body.Employee.Role != "sales_advisor" {
		t.Fatalf("unexpected body %s (%v)", rec.Body.String(), err)
	}
}

func TestASessionCookieHasNoMaxAgeWithoutRememberMe(t *testing.T) {
	env := newTestEnv(t)
	emp := env.createEmployee(t, RoleSalesAdvisor, goodPassword)
	rec := send(newTestRouter(env), http.MethodPost, "/api/v1/auth/employee/login", loginBody(emp, goodPassword, false), nil)
	if cookie := refreshCookie(t, rec); cookie.MaxAge != 0 {
		t.Fatalf("a session cookie must not be persistent: %+v", cookie)
	}
}

func TestRefreshNeedsTheCSRFHeaderAndAMatchingOrigin(t *testing.T) {
	env := newTestEnv(t)
	emp := env.createEmployee(t, RoleSalesAdvisor, goodPassword)
	router := newTestRouter(env)
	cookie := refreshCookie(t, send(router, http.MethodPost, "/api/v1/auth/employee/login", loginBody(emp, goodPassword, true), nil))

	withoutHeader := send(router, http.MethodPost, "/api/v1/auth/refresh", "", nil, cookie)
	if withoutHeader.Code != http.StatusForbidden || !strings.Contains(withoutHeader.Body.String(), "CSRF_REJECTED") {
		t.Fatalf("without the header: %d %s", withoutHeader.Code, withoutHeader.Body.String())
	}
	wrongOrigin := send(router, http.MethodPost, "/api/v1/auth/refresh", "",
		map[string]string{csrfHeader: csrfValue, "Origin": "http://evil.test"}, cookie)
	if wrongOrigin.Code != http.StatusForbidden {
		t.Fatalf("with a foreign origin: %d", wrongOrigin.Code)
	}
	ok := send(router, http.MethodPost, "/api/v1/auth/refresh", "",
		map[string]string{csrfHeader: csrfValue, "Origin": "http://app.test"}, cookie)
	if ok.Code != http.StatusOK || !strings.Contains(ok.Body.String(), "accessToken") {
		t.Fatalf("with the header and origin: %d %s", ok.Code, ok.Body.String())
	}
}

func TestRefreshWithoutACookieClearsAndFails(t *testing.T) {
	env := newTestEnv(t)
	rec := send(newTestRouter(env), http.MethodPost, "/api/v1/auth/refresh", "", map[string]string{csrfHeader: csrfValue})
	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), "SESSION_INVALID") {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
}

func TestMeRequiresABearerToken(t *testing.T) {
	env := newTestEnv(t)
	emp := env.createEmployee(t, RoleSalesAdvisor, goodPassword)
	router := newTestRouter(env)

	if rec := send(router, http.MethodGet, "/api/v1/me", "", nil); rec.Code != http.StatusUnauthorized ||
		!strings.Contains(rec.Body.String(), "ACCESS_TOKEN_INVALID") {
		t.Fatalf("without a token: %d %s", rec.Code, rec.Body.String())
	}
	session := env.mustLogin(t, emp, false)
	rec := send(router, http.MethodGet, "/api/v1/me", "", map[string]string{"Authorization": "Bearer " + session.AccessToken})
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), emp.DocNumber) {
		t.Fatalf("with a token: %d %s", rec.Code, rec.Body.String())
	}
}

func TestRequireRolesAllowsOnlyTheListedRoles(t *testing.T) {
	env := newTestEnv(t)
	advisor := env.createEmployee(t, RoleSalesAdvisor, goodPassword)
	manager := env.createEmployee(t, RoleSalesManager, goodPassword)
	router := newTestRouter(env)

	advisorToken := env.mustLogin(t, advisor, false).AccessToken
	managerToken := env.mustLogin(t, manager, false).AccessToken

	if rec := send(router, http.MethodGet, "/api/v1/managers-only", "", map[string]string{"Authorization": "Bearer " + advisorToken}); rec.Code != http.StatusForbidden {
		t.Fatalf("advisor: %d", rec.Code)
	}
	if rec := send(router, http.MethodGet, "/api/v1/managers-only", "", map[string]string{"Authorization": "Bearer " + managerToken}); rec.Code != http.StatusOK {
		t.Fatalf("manager: %d", rec.Code)
	}
}

func TestForgotPasswordAlwaysAnswers202(t *testing.T) {
	env := newTestEnv(t)
	rec := send(newTestRouter(env), http.MethodPost, "/api/v1/auth/forgot-password",
		`{"documentType":"DNI","documentNumber":"00000000"}`, nil)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}
}

func TestBadJSONIsRejected(t *testing.T) {
	env := newTestEnv(t)
	router := newTestRouter(env)
	for _, body := range []string{`not json`, `{"unknownField": 1}`, `{"documentType":"DNI"} trailing`} {
		rec := send(router, http.MethodPost, "/api/v1/auth/employee/login", body, nil)
		if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), "INVALID_JSON") {
			t.Fatalf("body %q: %d %s", body, rec.Code, rec.Body.String())
		}
	}
}

func TestLoginIsRateLimitedPerAddress(t *testing.T) {
	env := newTestEnv(t)
	router := newTestRouter(env)
	body := `{"documentType":"DNI","documentNumber":"00000000","password":"x"}`

	var last *httptest.ResponseRecorder
	for i := 0; i < 11; i++ {
		last = send(router, http.MethodPost, "/api/v1/auth/employee/login", body, nil)
	}
	if last.Code != http.StatusTooManyRequests || last.Header().Get("Retry-After") == "" {
		t.Fatalf("the 11th attempt must be limited: %d", last.Code)
	}
}
