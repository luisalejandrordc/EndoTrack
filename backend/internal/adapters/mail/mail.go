// Package mail defines how the application sends email and provides the senders available today.
// The Google Apps Script sender will be added here later, behind the same interface.
package mail

import (
	"context"
	"errors"
	"log/slog"
)

// Message is a plain-text email.
type Message struct {
	To      string
	Subject string
	Body    string
}

// Sender sends emails.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}

// ErrNotConfigured is returned by the sender used where no real email service exists yet.
var ErrNotConfigured = errors.New("mail: no email sender is configured for this environment")

type unconfigured struct{}

func (unconfigured) Send(context.Context, Message) error { return ErrNotConfigured }

// Unconfigured returns a sender that always fails, so a missing email service is never silent.
func Unconfigured() Sender { return unconfigured{} }

type logSender struct{ logger *slog.Logger }

// NewLogSender returns a sender that writes the whole email, links included, to the log instead of
// sending it. It is only for local development and tests.
func NewLogSender(logger *slog.Logger) Sender { return logSender{logger: logger} }

func (s logSender) Send(_ context.Context, msg Message) error {
	s.logger.Info("email not sent (local log sender)", "to", msg.To, "subject", msg.Subject, "body", msg.Body)
	return nil
}
