package auth

import "time"

// Lockout policy: five failed logins in a row lock the account for 15 minutes. A successful login
// clears the count, and so does the end of a lock.
const (
	MaxFailedLogins = 5
	LockoutDuration = 15 * time.Minute
)

// LoginState is the lockout data stored on an employee or customer.
type LoginState struct {
	FailedCount int
	LockedUntil *time.Time
}

// IsLocked reports whether the account is locked at the given moment.
func (s LoginState) IsLocked(now time.Time) bool {
	return s.LockedUntil != nil && now.Before(*s.LockedUntil)
}

// AfterFailure returns the state after one more failed login.
func (s LoginState) AfterFailure(now time.Time) LoginState {
	// A lock that has ended starts a fresh count.
	if s.LockedUntil != nil && !now.Before(*s.LockedUntil) {
		s = LoginState{}
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
