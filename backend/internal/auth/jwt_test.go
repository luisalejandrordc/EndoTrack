package auth

import (
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var testSecret = []byte("0123456789abcdef0123456789abcdef")

func TestIssueAndParseAccessToken(t *testing.T) {
	id := uuid.New()
	now := time.Now()
	token, expires, err := IssueAccessToken(testSecret, id, RoleSalesAdvisor, now)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if !expires.Equal(now.Add(AccessTokenTTL)) {
		t.Fatalf("unexpected expiry %v", expires)
	}
	claims, err := ParseAccessToken(testSecret, token, now.Add(time.Minute))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if claims.EmployeeID != id || claims.Role != RoleSalesAdvisor {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestExpiredTokenIsRejected(t *testing.T) {
	now := time.Now()
	token, _, _ := IssueAccessToken(testSecret, uuid.New(), RoleSalesManager, now)
	_, err := ParseAccessToken(testSecret, token, now.Add(AccessTokenTTL+time.Second))
	if !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("got %v, want ErrInvalidToken", err)
	}
}

func TestTokenSignedWithAnotherSecretIsRejected(t *testing.T) {
	now := time.Now()
	token, _, _ := IssueAccessToken([]byte("a-completely-different-secret-value!"), uuid.New(), RoleSystemAdmin, now)
	if _, err := ParseAccessToken(testSecret, token, now); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("got %v, want ErrInvalidToken", err)
	}
}

func TestTamperedTokenIsRejected(t *testing.T) {
	now := time.Now()
	token, _, _ := IssueAccessToken(testSecret, uuid.New(), RoleSalesAdvisor, now)
	tampered := token[:len(token)-3] + "AAA"
	if _, err := ParseAccessToken(testSecret, tampered, now); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("got %v, want ErrInvalidToken", err)
	}
}

func TestUnsignedTokenIsRejected(t *testing.T) {
	now := time.Now()
	claims := tokenClaims{
		Role:        string(RoleSystemAdmin),
		AccountType: accountTypeStaff,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tokenIssuer,
			Subject:   uuid.NewString(),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("build unsigned token: %v", err)
	}
	if _, err := ParseAccessToken(testSecret, token, now); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("an unsigned token must be rejected, got %v", err)
	}
}

func TestUnknownRoleIsRejected(t *testing.T) {
	now := time.Now()
	claims := tokenClaims{
		Role:        "root",
		AccountType: accountTypeStaff,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tokenIssuer,
			Subject:   uuid.NewString(),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
		},
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(testSecret)
	if _, err := ParseAccessToken(testSecret, token, now); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("got %v, want ErrInvalidToken", err)
	}
}

func TestACustomerStyleTokenIsRejected(t *testing.T) {
	now := time.Now()
	claims := tokenClaims{
		Role:        string(RoleSalesAdvisor),
		AccountType: "customer",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tokenIssuer,
			Subject:   uuid.NewString(),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
		},
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(testSecret)
	if _, err := ParseAccessToken(testSecret, token, now); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("got %v, want ErrInvalidToken", err)
	}
}

func TestGarbageIsRejected(t *testing.T) {
	for _, bad := range []string{"", "not-a-token", "a.b.c"} {
		if _, err := ParseAccessToken(testSecret, bad, time.Now()); !errors.Is(err, ErrInvalidToken) {
			t.Errorf("%q: got %v, want ErrInvalidToken", bad, err)
		}
	}
}
