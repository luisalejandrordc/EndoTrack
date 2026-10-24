// Command api starts the EndosoFlow HTTP server.
package main

import (
	"context"
	"endosoflow/internal/adapters/mail"
	"endosoflow/internal/auth"
	"endosoflow/internal/platform/config"
	"endosoflow/internal/platform/database"
	"endosoflow/internal/platform/logging"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "fatal:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}
	logger := logging.New(cfg, os.Stdout)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	// Until the real email service exists, emails are only written to the log in local and test
	// environments; elsewhere sending fails loudly instead of silently dropping messages.
	var sender mail.Sender = mail.Unconfigured()
	if cfg.Env == "local" || cfg.Env == "test" {
		sender = mail.NewLogSender(logger)
	}
	authService := auth.NewService(auth.Deps{
		DB: pool, JWTSecret: cfg.JWTSecret, AppBaseURL: cfg.AppBaseURL, Mail: sender, Logger: logger,
	})
	authHandler := auth.NewHandler(authService, logger, auth.HandlerConfig{
		AppBaseURL: cfg.AppBaseURL, CookieSecure: cfg.CookieSecure, TrustProxy: cfg.TrustProxy,
	})

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           newRouter(logger, pool, authHandler.Mount),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       60 * time.Second, // uploads of up to 10 MB
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("server listening", "addr", cfg.HTTPAddr)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("server: %w", err)
		}
		return nil
	case <-ctx.Done():
		logger.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("graceful shutdown: %w", err)
		}
		authService.WaitForBackgroundWork()
		return nil
	}
}
