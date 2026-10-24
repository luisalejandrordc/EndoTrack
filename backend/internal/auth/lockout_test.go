package auth

import (
	"testing"
	"time"
)

func TestFiveFailuresLockTheAccount(t *testing.T) {
	now := time.Date(2026, 10, 19, 9, 0, 0, 0, time.UTC)
	state := LoginState{}
	for i := 1; i < MaxFailedLogins; i++ {
		state = state.AfterFailure(now)
		if state.IsLocked(now) {
			t.Fatalf("locked too early after %d failures", i)
		}
	}
	state = state.AfterFailure(now)
	if !state.IsLocked(now) || state.FailedCount != MaxFailedLogins {
		t.Fatalf("expected a lock after %d failures: %+v", MaxFailedLogins, state)
	}
	if !state.LockedUntil.Equal(now.Add(LockoutDuration)) {
		t.Fatalf("unexpected lock end: %v", state.LockedUntil)
	}
}

func TestTheLockEnds(t *testing.T) {
	now := time.Date(2026, 10, 19, 9, 0, 0, 0, time.UTC)
	until := now.Add(LockoutDuration)
	state := LoginState{FailedCount: MaxFailedLogins, LockedUntil: &until}
	if !state.IsLocked(until.Add(-time.Second)) {
		t.Fatal("must still be locked one second before the end")
	}
	if state.IsLocked(until) {
		t.Fatal("must be unlocked at the end of the lock")
	}
}

func TestAFailureAfterTheLockEndedStartsAFreshCount(t *testing.T) {
	now := time.Date(2026, 10, 19, 9, 0, 0, 0, time.UTC)
	until := now.Add(LockoutDuration)
	state := LoginState{FailedCount: MaxFailedLogins, LockedUntil: &until}
	after := state.AfterFailure(until.Add(time.Minute))
	if after.FailedCount != 1 || after.LockedUntil != nil {
		t.Fatalf("expected a fresh count of 1 and no lock: %+v", after)
	}
}

func TestSuccessClearsEverything(t *testing.T) {
	now := time.Now()
	state := LoginState{FailedCount: 4, LockedUntil: &now}
	if got := state.AfterSuccess(); got.FailedCount != 0 || got.LockedUntil != nil {
		t.Fatalf("unexpected state after success: %+v", got)
	}
}
