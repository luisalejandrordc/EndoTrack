// Package codart is the client for the Codart identity API, used only from the backend: the token
// never reaches the browser. DNI lookups return a person's names (RENIEC); RUC lookups return the legal
// name (SUNAT).
package codart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DefaultBaseURL is the production Codart address.
const DefaultBaseURL = "https://api-codart.cgrt.org"

// ErrNotFound means the provider answered but has no record for the document.
var ErrNotFound = errors.New("codart: document not found")

// Person is the name data returned for a DNI. LastName joins the first and second surname.
type Person struct {
	FirstName string
	LastName  string
}

// Client calls the Codart API.
type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

// New builds a client. An empty baseURL means DefaultBaseURL; a nil httpClient gets a 5 second timeout.
func New(baseURL, token string, httpClient *http.Client) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	return &Client{baseURL: strings.TrimRight(baseURL, "/"), token: token, http: httpClient}
}

type response struct {
	Result struct {
		FirstName      string `json:"first_name"`
		FirstLastName  string `json:"first_last_name"`
		SecondLastName string `json:"second_last_name"`
		RazonSocial    string `json:"razon_social"`
	} `json:"result"`
}

// LookupDNI returns the names registered for an 8-digit DNI.
func (c *Client) LookupDNI(ctx context.Context, dni string) (Person, error) {
	var body response
	if err := c.get(ctx, "/api/v1/consultas/reniec/dni/"+url.PathEscape(dni), &body); err != nil {
		return Person{}, err
	}
	r := body.Result
	person := Person{
		FirstName: strings.TrimSpace(r.FirstName),
		LastName:  strings.TrimSpace(strings.TrimSpace(r.FirstLastName) + " " + strings.TrimSpace(r.SecondLastName)),
	}
	if person.FirstName == "" || person.LastName == "" {
		return Person{}, ErrNotFound
	}
	return person, nil
}

// LookupRUC returns the legal name ("razón social") registered for an 11-digit RUC.
func (c *Client) LookupRUC(ctx context.Context, ruc string) (string, error) {
	var body response
	if err := c.get(ctx, "/api/v1/consultas/sunat/ruc/"+url.PathEscape(ruc), &body); err != nil {
		return "", err
	}
	name := strings.TrimSpace(body.Result.RazonSocial)
	if name == "" {
		return "", ErrNotFound
	}
	return name, nil
}

func (c *Client) get(ctx context.Context, path string, out *response) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("codart request: %w", err) // never include the request: it carries the token
	}
	defer res.Body.Close()

	switch {
	case res.StatusCode == http.StatusNotFound:
		return ErrNotFound
	case res.StatusCode < 200 || res.StatusCode > 299:
		return fmt.Errorf("codart: unexpected status %d", res.StatusCode)
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(out); err != nil {
		return fmt.Errorf("codart: unreadable response: %w", err)
	}
	return nil
}
