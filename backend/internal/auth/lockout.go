package auth

import "time"

// Lockout policy: five failed logins within 15 minutes of the first one lock the account for 15 minutes.
// A successful login clears the count, and so does the end of a lock.
const (
	MaxFailedLogins = 5
	FailureWindow   = 15 * time.Minute
	LockoutDuration = 15 * time.Minute
)

// LoginState is the lockout data stored on an employee or customer.
type LoginState struct {
	FailedCount     int
	WindowStartedAt *time.Time // when the first failure of the current window happened
	LockedUntil     *time.Time
}

// IsLocked reports whether the account is locked at the given moment.
func (s LoginState) IsLocked(now time.Time) bool {
	return s.LockedUntil != nil && now.Before(*s.LockedUntil)
}

// AfterFailure returns the state after one more failed login. While the account is locked nothing
// changes, so repeated attempts cannot extend the lock.
func (s LoginState) AfterFailure(now time.Time) LoginState {
	if s.IsLocked(now) {
		return s
	}
	if s.LockedUntil != nil {
		// The lock has ended: start from zero.
		s = LoginState{}
	}
	if s.WindowStartedAt == nil || now.Sub(*s.WindowStartedAt) > FailureWindow {
		// No window yet, or the previous one has run out: this failure opens a new window.
		start := now
		s = LoginState{WindowStartedAt: &start}
	}
	s.FailedCount++
	if s.FailedCount >= MaxFailedLogins {
		until := now.Add(LockoutDuration)
		s.LockedUntil = &until
	}
	return s
}

// AfterSuccess returns the cleared state after a successful login.
func (s LoginState) AfterSuccess() LoginState {
	return LoginState{}
}
