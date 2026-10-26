package codart

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func serve(t *testing.T, status int, body string, check func(*http.Request)) *Client {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if check != nil {
			check(r)
		}
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(server.Close)
	return New(server.URL, "secret-token", nil)
}

func TestLookupDNIJoinsBothSurnamesAndSendsTheToken(t *testing.T) {
	client := serve(t, 200,
		`{"result":{"first_name":"LUCIA","first_last_name":"QUISPE","second_last_name":"MAMANI"}}`,
		func(r *http.Request) {
			if r.URL.Path != "/api/v1/consultas/reniec/dni/12345678" {
				t.Errorf("path = %s", r.URL.Path)
			}
			if r.Header.Get("Authorization") != "Bearer secret-token" {
				t.Errorf("authorization header = %q", r.Header.Get("Authorization"))
			}
			if r.Header.Get("Content-Type") != "application/json" {
				t.Errorf("content type = %q", r.Header.Get("Content-Type"))
			}
		})
	person, err := client.LookupDNI(context.Background(), "12345678")
	if err != nil {
		t.Fatal(err)
	}
	if person.FirstName != "LUCIA" || person.LastName != "QUISPE MAMANI" {
		t.Fatalf("person = %+v", person)
	}
}

func TestLookupDNIWithOnlyOneSurname(t *testing.T) {
	client := serve(t, 200, `{"result":{"first_name":"ANA","first_last_name":"ROJAS","second_last_name":""}}`, nil)
	person, err := client.LookupDNI(context.Background(), "12345678")
	if err != nil || person.LastName != "ROJAS" {
		t.Fatalf("person = %+v, err = %v", person, err)
	}
}

func TestLookupRUCReturnsTheLegalName(t *testing.T) {
	client := serve(t, 200, `{"result":{"razon_social":"EMBAJADA DE PRUEBA"}}`, func(r *http.Request) {
		if r.URL.Path != "/api/v1/consultas/sunat/ruc/20123456789" {
			t.Errorf("path = %s", r.URL.Path)
		}
	})
	name, err := client.LookupRUC(context.Background(), "20123456789")
	if err != nil || name != "EMBAJADA DE PRUEBA" {
		t.Fatalf("name = %q, err = %v", name, err)
	}
}

func TestNotFoundCases(t *testing.T) {
	for name, client := range map[string]*Client{
		"http 404":     serve(t, 404, `{}`, nil),
		"empty result": serve(t, 200, `{"result":{}}`, nil),
	} {
		if _, err := client.LookupDNI(context.Background(), "12345678"); !errors.Is(err, ErrNotFound) {
			t.Errorf("%s: dni err = %v, want ErrNotFound", name, err)
		}
		if _, err := client.LookupRUC(context.Background(), "20123456789"); !errors.Is(err, ErrNotFound) {
			t.Errorf("%s: ruc err = %v, want ErrNotFound", name, err)
		}
	}
}

func TestProviderFailuresAreNotNotFound(t *testing.T) {
	for name, client := range map[string]*Client{
		"server error": serve(t, 500, `{}`, nil),
		"bad token":    serve(t, 401, `{}`, nil),
		"quota":        serve(t, 429, `{}`, nil),
		"bad json":     serve(t, 200, `not json`, nil),
	} {
		_, err := client.LookupDNI(context.Background(), "12345678")
		if err == nil || errors.Is(err, ErrNotFound) {
			t.Errorf("%s: err = %v, want a failure that is not ErrNotFound", name, err)
		}
	}
}

func TestFailuresNeverLeakTheToken(t *testing.T) {
	client := New("http://127.0.0.1:1", "secret-token", nil) // nothing listens there
	_, err := client.LookupDNI(context.Background(), "12345678")
	if err == nil {
		t.Fatal("expected a connection error")
	}
	if msg := err.Error(); contains(msg, "secret-token") {
		t.Fatalf("error leaks the token: %s", msg)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
