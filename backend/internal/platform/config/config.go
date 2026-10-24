// Package config reads the application's settings from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"
)

// Config holds every setting the API needs. It is built once at startup.
type Config struct {
	Env             string // local, test, staging or production
	HTTPAddr        string // address the server listens on, for example ":8080"
	DatabaseURL     string
	LogLevel        slog.Level
	LogFormat       string // "text" (readable) or "json" (for hosting platforms)
	ShutdownTimeout time.Duration
	JWTSecret       string // signs access tokens; at least 32 characters
	AppBaseURL      string // the frontend address used in emailed links, without a trailing slash
	CookieSecure    bool   // refresh cookie "Secure" flag; true everywhere except local development
}

var validEnvs = map[string]bool{"local": true, "test": true, "staging": true, "production": true}

// Load builds the configuration from the given lookup function (os.Getenv in production,
// a map in tests). It reports every problem at once instead of stopping at the first.
func Load(getenv func(string) string) (Config, error) {
	var problems []string
	var cfg Config

	cfg.Env = valueOr(getenv("ENV"), "local")
	if !validEnvs[cfg.Env] {
		problems = append(problems, fmt.Sprintf("ENV must be local, test, staging or production (got %q)", cfg.Env))
	}

	cfg.HTTPAddr = getenv("HTTP_ADDR")
	if cfg.HTTPAddr == "" {
		// Render and similar hosts provide the port in PORT.
		if port := getenv("PORT"); port != "" {
			cfg.HTTPAddr = ":" + port
		} else {
			cfg.HTTPAddr = ":8080"
		}
	}

	cfg.DatabaseURL = getenv("DATABASE_URL")
	if cfg.DatabaseURL == "" {
		problems = append(problems, "DATABASE_URL is required")
	}

	levelText := valueOr(getenv("LOG_LEVEL"), "info")
	if err := cfg.LogLevel.UnmarshalText([]byte(levelText)); err != nil {
		problems = append(problems, fmt.Sprintf("LOG_LEVEL must be debug, info, warn or error (got %q)", levelText))
	}

	defaultFormat := "json"
	if cfg.Env == "local" {
		defaultFormat = "text"
	}
	cfg.LogFormat = valueOr(getenv("LOG_FORMAT"), defaultFormat)
	if cfg.LogFormat != "text" && cfg.LogFormat != "json" {
		problems = append(problems, fmt.Sprintf("LOG_FORMAT must be text or json (got %q)", cfg.LogFormat))
	}

	timeoutText := valueOr(getenv("SHUTDOWN_TIMEOUT"), "10s")
	timeout, err := time.ParseDuration(timeoutText)
	if err != nil || timeout <= 0 {
		problems = append(problems, fmt.Sprintf("SHUTDOWN_TIMEOUT must be a positive duration such as 10s (got %q)", timeoutText))
	} else {
		cfg.ShutdownTimeout = timeout
	}

	cfg.JWTSecret = getenv("JWT_SECRET")
	if len(cfg.JWTSecret) < 32 {
		problems = append(problems, "JWT_SECRET is required and must be at least 32 characters")
	}

	cfg.AppBaseURL = strings.TrimRight(getenv("APP_BASE_URL"), "/")
	if cfg.AppBaseURL == "" {
		if cfg.Env == "local" {
			cfg.AppBaseURL = "http://localhost:5173"
		} else {
			problems = append(problems, "APP_BASE_URL is required outside local development (emailed links use it)")
		}
	}

	cfg.CookieSecure = cfg.Env != "local"
	if text := getenv("COOKIE_SECURE"); text != "" {
		secure, err := strconv.ParseBool(text)
		if err != nil {
			problems = append(problems, fmt.Sprintf("COOKIE_SECURE must be true or false (got %q)", text))
		} else {
			cfg.CookieSecure = secure
		}
	}

	if len(problems) > 0 {
		return Config{}, errors.New("invalid configuration:\n  - " + strings.Join(problems, "\n  - "))
	}
	return cfg, nil
}

func valueOr(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
