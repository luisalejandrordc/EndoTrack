package auth

import (
	"testing"
	"time"
)

var t0 = time.Date(2026, 10, 19, 9, 0, 0, 0, time.UTC)

func failTimes(state LoginState, at ...time.Time) LoginState {
	for _, moment := range at {
		state = state.AfterFailure(moment)
	}
	return state
}

func TestFiveFailuresInsideTheWindowLockTheAccount(t *testing.T) {
	state := failTimes(LoginState{}, t0, t0.Add(time.Minute), t0.Add(2*time.Minute), t0.Add(3*time.Minute))
	if state.IsLocked(t0.Add(3 * time.Minute)) {
		t.Fatal("four failures must not lock")
	}
	fifth := t0.Add(4 * time.Minute)
	state = state.AfterFailure(fifth)
	if !state.IsLocked(fifth) || state.FailedCount != MaxFailedLogins {
		t.Fatalf("the fifth failure must lock: %+v", state)
	}
	if !state.LockedUntil.Equal(fifth.Add(LockoutDuration)) {
		t.Fatalf("unexpected lock end: %v", state.LockedUntil)
	}
}

func TestTheFifthFailureAtExactlyFifteenMinutesStillLocks(t *testing.T) {
	state := failTimes(LoginState{}, t0, t0.Add(time.Minute), t0.Add(2*time.Minute), t0.Add(3*time.Minute),
		t0.Add(FailureWindow))
	if !state.IsLocked(t0.Add(FailureWindow)) {
		t.Fatalf("five failures within the window must lock: %+v", state)
	}
}

func TestFailuresSpreadOutsideTheWindowDoNotLock(t *testing.T) {
	// Four failures, then a fifth sixteen minutes after the first: a new window starts.
	state := failTimes(LoginState{}, t0, t0.Add(time.Minute), t0.Add(2*time.Minute), t0.Add(3*time.Minute),
		t0.Add(16*time.Minute))
	if state.IsLocked(t0.Add(16*time.Minute)) || state.FailedCount != 1 {
		t.Fatalf("expected a fresh count of 1 and no lock: %+v", state)
	}
}

func TestSlowFailuresNeverAccumulate(t *testing.T) {
	// One failure every 14 minutes never reaches five inside a single window.
	state := LoginState{}
	for i := 0; i < 20; i++ {
		state = state.AfterFailure(t0.Add(time.Duration(i) * 14 * time.Minute))
		if state.IsLocked(t0.Add(time.Duration(i) * 14 * time.Minute)) {
			t.Fatalf("locked after %d slow failures: %+v", i+1, state)
		}
	}
}

func TestAttemptsDuringALockDoNotExtendIt(t *testing.T) {
	state := failTimes(LoginState{}, t0, t0, t0, t0, t0)
	end := *state.LockedUntil
	state = state.AfterFailure(t0.Add(5 * time.Minute))
	if !state.LockedUntil.Equal(end) || state.FailedCount != MaxFailedLogins {
		t.Fatalf("the lock must not change while locked: %+v", state)
	}
}

func TestTheLockEnds(t *testing.T) {
	state := failTimes(LoginState{}, t0, t0, t0, t0, t0)
	until := *state.LockedUntil
	if !state.IsLocked(until.Add(-time.Second)) {
		t.Fatal("must still be locked one second before the end")
	}
	if state.IsLocked(until) {
		t.Fatal("must be unlocked at the end of the lock")
	}
}

func TestAFailureAfterTheLockEndedStartsAFreshCount(t *testing.T) {
	state := failTimes(LoginState{}, t0, t0, t0, t0, t0)
	after := state.AfterFailure(state.LockedUntil.Add(time.Minute))
	if after.FailedCount != 1 || after.LockedUntil != nil || after.WindowStartedAt == nil {
		t.Fatalf("expected a fresh count of 1 and no lock: %+v", after)
	}
}

func TestSuccessClearsEverything(t *testing.T) {
	state := failTimes(LoginState{}, t0, t0, t0)
	if got := state.AfterSuccess(); got.FailedCount != 0 || got.LockedUntil != nil || got.WindowStartedAt != nil {
		t.Fatalf("unexpected state after success: %+v", got)
	}
}
