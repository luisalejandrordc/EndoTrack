package config

import (
	"log/slog"
	"strings"
	"testing"
	"time"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(env(map[string]string{"DATABASE_URL": "postgres://localhost/db"}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Env != "local" || cfg.HTTPAddr != ":8080" || cfg.LogFormat != "text" ||
		cfg.LogLevel != slog.LevelInfo || cfg.ShutdownTimeout != 10*time.Second {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
}

func TestLoadUsesPortWhenAddressIsNotSet(t *testing.T) {
	cfg, err := Load(env(map[string]string{"DATABASE_URL": "x", "PORT": "10000"}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.HTTPAddr != ":10000" {
		t.Fatalf("got %q, want :10000", cfg.HTTPAddr)
	}
}

func TestLoadExplicitAddressWinsOverPort(t *testing.T) {
	cfg, err := Load(env(map[string]string{"DATABASE_URL": "x", "PORT": "10000", "HTTP_ADDR": "127.0.0.1:9000"}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.HTTPAddr != "127.0.0.1:9000" {
		t.Fatalf("got %q", cfg.HTTPAddr)
	}
}

func TestLoadProductionDefaultsToJSONLogs(t *testing.T) {
	cfg, err := Load(env(map[string]string{"DATABASE_URL": "x", "ENV": "production"}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.LogFormat != "json" {
		t.Fatalf("got %q, want json", cfg.LogFormat)
	}
}

func TestLoadReportsEveryProblemAtOnce(t *testing.T) {
	_, err := Load(env(map[string]string{"ENV": "nope", "LOG_LEVEL": "loud", "SHUTDOWN_TIMEOUT": "soon"}))
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, want := range []string{"DATABASE_URL is required", "ENV must be", "LOG_LEVEL must be", "SHUTDOWN_TIMEOUT must be"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error %q does not mention %q", err.Error(), want)
		}
	}
}
