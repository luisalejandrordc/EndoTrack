package auth

import (
	"endosoflow/internal/platform/ids"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Role is an employee's role.
type Role string

const (
	RoleSystemAdmin  Role = "system_admin"
	RoleSalesManager Role = "sales_manager"
	RoleSalesAdvisor Role = "sales_advisor"
)

func (r Role) valid() bool {
	return r == RoleSystemAdmin || r == RoleSalesManager || r == RoleSalesAdvisor
}

// AccessTokenTTL is how long an access token lives. Sessions are kept alive by the refresh token.
const AccessTokenTTL = 15 * time.Minute

const (
	tokenIssuer      = "endosoflow"
	accountTypeStaff = "employee"
)

// ErrInvalidToken is returned for any access token that cannot be trusted.
var ErrInvalidToken = errors.New("auth: invalid access token")

// AccessClaims is what a valid access token tells us about the caller. The role in it is only a hint:
// every request re-checks the employee in the database.
type AccessClaims struct {
	EmployeeID uuid.UUID
	Role       Role
}

type tokenClaims struct {
	Role        string `json:"role"`
	AccountType string `json:"acct"`
	jwt.RegisteredClaims
}

// IssueAccessToken signs a short-lived access token for an employee and returns its expiry.
func IssueAccessToken(secret []byte, employeeID uuid.UUID, role Role, now time.Time) (string, time.Time, error) {
	expires := now.Add(AccessTokenTTL)
	claims := tokenClaims{
		Role:        string(role),
		AccountType: accountTypeStaff,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    tokenIssuer,
			Subject:   employeeID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expires),
			ID:        ids.NewString(),
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}
	return signed, expires, nil
}

// ParseAccessToken verifies the signature, algorithm, issuer, expiry and shape of an access token.
// now is passed in so tests can control time.
func ParseAccessToken(secret []byte, token string, now time.Time) (AccessClaims, error) {
	parsed, err := jwt.ParseWithClaims(token, &tokenClaims{},
		func(*jwt.Token) (any, error) { return secret, nil },
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(tokenIssuer),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(func() time.Time { return now }),
	)
	if err != nil {
		return AccessClaims{}, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	claims, ok := parsed.Claims.(*tokenClaims)
	if !ok || !parsed.Valid || claims.AccountType != accountTypeStaff {
		return AccessClaims{}, ErrInvalidToken
	}
	employeeID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return AccessClaims{}, ErrInvalidToken
	}
	role := Role(claims.Role)
	if !role.valid() {
		return AccessClaims{}, ErrInvalidToken
	}
	return AccessClaims{EmployeeID: employeeID, Role: role}, nil
}
