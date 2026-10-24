package auth

import "testing"

func TestNewTokenReturnsAMatchingHash(t *testing.T) {
	plain, hash, err := NewToken()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(plain) < 40 {
		t.Fatalf("token looks too short: %d characters", len(plain))
	}
	if hash != HashToken(plain) {
		t.Fatal("the returned hash must equal HashToken(plain)")
	}
	if hash == plain {
		t.Fatal("the stored hash must not be the token itself")
	}
}

func TestNewTokensAreUnique(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 100; i++ {
		plain, _, err := NewToken()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if seen[plain] {
			t.Fatal("duplicate token generated")
		}
		seen[plain] = true
	}
}

func TestHashTokenIsStable(t *testing.T) {
	if HashToken("abc") != HashToken("abc") || HashToken("abc") == HashToken("abd") {
		t.Fatal("hashing must be deterministic and distinguish inputs")
	}
	// SHA-256 of "abc", a well-known value.
	const want = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
	if got := HashToken("abc"); got != want {
		t.Fatalf("got %s, want %s", got, want)
	}
}
