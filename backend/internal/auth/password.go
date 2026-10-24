// Package auth holds employee authentication: password hashing, tokens, lockout and (soon) the
// login, session and recovery flows.
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"endosoflow/internal/platform/apperr"
	"errors"
	"fmt"
	"strings"
	"sync"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
)

// Argon2id parameters: the OWASP minimum recommendation (19 MiB of memory, 2 passes, 1 lane).
// It keeps a login fast and light enough for a small free-tier instance. Because the parameters are
// stored inside every hash, they can be raised later without invalidating existing passwords.
const (
	argonMemoryKiB = 19 * 1024
	argonPasses    = 2
	argonThreads   = 1
	argonKeyLength = 32
	argonSaltBytes = 16
)

// ErrInvalidHash is returned when a stored hash is not in the expected format.
var ErrInvalidHash = errors.New("auth: invalid password hash format")

// HashPassword returns the Argon2id hash of password, with its salt and parameters, as text.
func HashPassword(password string) (string, error) {
	salt := make([]byte, argonSaltBytes)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, argonPasses, argonMemoryKiB, argonThreads, argonKeyLength)
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemoryKiB, argonPasses, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(key)), nil
}

// VerifyPassword reports whether password matches the stored hash, in constant time.
func VerifyPassword(password, encoded string) (bool, error) {
	parts := strings.Split(encoded, "$")
	// "", "argon2id", "v=19", "m=19456,t=2,p=1", salt, key
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, ErrInvalidHash
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false, ErrInvalidHash
	}
	var memory, passes uint32
	var threads uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &passes, &threads); err != nil {
		return false, ErrInvalidHash
	}
	if memory == 0 || memory > 256*1024 || passes == 0 || passes > 10 || threads == 0 {
		return false, ErrInvalidHash
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) == 0 {
		return false, ErrInvalidHash
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(want) == 0 {
		return false, ErrInvalidHash
	}
	got := argon2.IDKey([]byte(password), salt, passes, memory, threads, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1, nil
}

var dummyHash = sync.OnceValue(func() string {
	hash, err := HashPassword("not-a-real-password")
	if err != nil {
		panic(err)
	}
	return hash
})

// SpendPasswordCheckTime does the same work as a real password check. Login calls it when the
// account does not exist, so response time never reveals whether an identifier is registered.
func SpendPasswordCheckTime(password string) {
	_, _ = VerifyPassword(password, dummyHash())
}

// Password policy limits.
const (
	MinPasswordLength = 10
	MaxPasswordLength = 128 // caps the work an attacker can force with huge inputs
)

// A short list of the most common passwords of 10 or more characters. It is a safety net, not a
// substitute for length; it can grow later.
var commonPasswords = map[string]bool{
	"1234567890": true, "0123456789": true, "12345678910": true, "1234567891": true,
	"qwertyuiop": true, "qwertyuiop1": true, "asdfghjkl1": true, "password12": true,
	"password123": true, "password1234": true, "passw0rd123": true, "contrasena1": true,
	"contrasena12": true, "contrasena123": true, "contraseña123": true, "administrador": true,
	"administrator": true, "welcome123": true, "iloveyou123": true, "letmein1234": true,
	"grupopana123": true, "endosoflow": true, "endosoflow123": true, "toyota12345": true,
	"1q2w3e4r5t": true, "abcdefghij": true, "abc1234567": true, "peru123456": true,
}

// ValidatePassword checks the password policy. identifier is the person's document number, which
// may not be used as the password. It returns nil when the password is acceptable.
func ValidatePassword(password, identifier string) *apperr.Error {
	var message string
	switch length := utf8.RuneCountInString(password); {
	case length < MinPasswordLength:
		message = fmt.Sprintf("La contraseña debe tener al menos %d caracteres.", MinPasswordLength)
	case length > MaxPasswordLength:
		message = fmt.Sprintf("La contraseña no puede tener más de %d caracteres.", MaxPasswordLength)
	case identifier != "" && strings.EqualFold(password, identifier):
		message = "La contraseña no puede ser igual a su número de documento."
	case commonPasswords[strings.ToLower(password)]:
		message = "Esa contraseña es demasiado común. Elija otra."
	default:
		return nil
	}
	return apperr.Unprocessable("PASSWORD_TOO_WEAK", message).
		WithFields(apperr.FieldError{Field: "password", Code: "PASSWORD_TOO_WEAK", Message: message})
}
