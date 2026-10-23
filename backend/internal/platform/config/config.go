// Package config reads the application's settings from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
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
