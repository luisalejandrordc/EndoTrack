package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

// NewToken returns a random secret for the user (refresh tokens, activation and reset links) and the
// hash to store. Only the hash is ever saved, so a database leak does not reveal usable tokens.
func NewToken() (plain, hash string, err error) {
	raw := make([]byte, 32) // 256 bits
	if _, err := rand.Read(raw); err != nil {
		return "", "", fmt.Errorf("generate token: %w", err)
	}
	plain = base64.RawURLEncoding.EncodeToString(raw)
	return plain, HashToken(plain), nil
}

// HashToken returns the hex SHA-256 of a token. The tokens are long random values, so a fast hash is
// appropriate (unlike passwords).
func HashToken(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}
