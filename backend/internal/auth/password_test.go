package auth

import (
	"errors"
	"strings"
	"testing"
)

func TestHashAndVerifyRoundTrip(t *testing.T) {
	hash, err := HashPassword("una contraseña segura 123")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !strings.HasPrefix(hash, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Fatalf("unexpected hash format: %s", hash)
	}
	ok, err := VerifyPassword("una contraseña segura 123", hash)
	if err != nil || !ok {
		t.Fatalf("the right password must verify (ok=%v err=%v)", ok, err)
	}
	ok, err = VerifyPassword("otra contraseña distinta", hash)
	if err != nil || ok {
		t.Fatalf("a wrong password must not verify (ok=%v err=%v)", ok, err)
	}
}

func TestTheSamePasswordGetsADifferentHashEachTime(t *testing.T) {
	a, _ := HashPassword("misma contraseña 12345")
	b, _ := HashPassword("misma contraseña 12345")
	if a == b {
		t.Fatal("hashes must use a fresh random salt")
	}
}

func TestVerifyRejectsMalformedHashes(t *testing.T) {
	for _, bad := range []string{
		"",
		"plain text",
		"$argon2id$v=19$m=1$x",
		"$bcrypt$v=19$m=19456,t=2,p=1$c2FsdA$a2V5",
		"$argon2id$v=18$m=19456,t=2,p=1$c2FsdHNhbHQ$a2V5a2V5",
		"$argon2id$v=19$m=0,t=2,p=1$c2FsdHNhbHQ$a2V5a2V5",
		"$argon2id$v=19$m=19456,t=2,p=1$!!!$a2V5a2V5",
	} {
		if _, err := VerifyPassword("x", bad); !errors.Is(err, ErrInvalidHash) {
			t.Errorf("hash %q: got %v, want ErrInvalidHash", bad, err)
		}
	}
}

func TestSpendPasswordCheckTimeDoesNotPanic(t *testing.T) {
	SpendPasswordCheckTime("anything")
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name       string
		password   string
		identifier string
		wantCode   string // empty means acceptable
	}{
		{"too short", "corta123", "10000001", "PASSWORD_TOO_WEAK"},
		{"exactly the minimum", "abcdefg123", "10000001", ""},
		{"equal to the document number", "ABC123456789", "abc123456789", "PASSWORD_TOO_WEAK"},
		{"very common", "Password123", "10000001", "PASSWORD_TOO_WEAK"},
		{"too long", strings.Repeat("a", 129), "10000001", "PASSWORD_TOO_WEAK"},
		{"good passphrase", "Correct-Horse-Battery-9", "10000001", ""},
		{"accents count as single characters", "contraseña-ñandú-2026", "10000001", ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidatePassword(tc.password, tc.identifier)
			switch {
			case tc.wantCode == "" && err != nil:
				t.Fatalf("unexpected rejection: %v", err)
			case tc.wantCode != "" && err == nil:
				t.Fatal("expected a rejection")
			case tc.wantCode != "" && (err.Code != tc.wantCode || len(err.Fields) != 1 || err.Fields[0].Field != "password"):
				t.Fatalf("unexpected error: %+v", err)
			}
		})
	}
}
