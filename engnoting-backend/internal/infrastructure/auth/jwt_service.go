package auth

import (
	cryptorand "crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/sonsonha/eng-noting/internal/domain"
)

type JwtService struct {
	secret               string
	accessExpireMinutes  int
	refreshExpireMinutes int
	tokenType            string
	tokenVersion         int
}

func NewJwtService(secret string, accessExpireMinutes int, refreshExpireMinutes int, tokenType string, tokenVersion int) *JwtService {
	return &JwtService{secret: secret, accessExpireMinutes: accessExpireMinutes, refreshExpireMinutes: refreshExpireMinutes, tokenType: tokenType, tokenVersion: tokenVersion}
}

func (s *JwtService) GenerateAccessToken(userID string, familyID string) (string, error) {
	claims := jwt.MapClaims{
		"sub":       userID,
		"exp":       time.Now().Add(time.Duration(s.accessExpireMinutes) * time.Minute).Unix(),
		"type":      s.tokenType,
		"version":   s.tokenVersion,
		"family_id": familyID,
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.secret))
}

// func (s *JwtService) GenerateRefreshPlain() (string, error) {
// 	opaqueTokenBytes := make([]byte, 32)
// 	if _, err := rand.Read(opaqueTokenBytes); err != nil {
// 		return "", err
// 	}
// 	opaqueToken := base64.URLEncoding.EncodeToString(opaqueTokenBytes)
// 	return opaqueToken, nil
// }

func (s *JwtService) GenerateRefreshPlain() (string, error) {
	opaqueTokenBytes := make([]byte, 32)
	if _, err := cryptorand.Read(opaqueTokenBytes); err != nil {
		return "", err
	}
	// RawURLEncoding bỏ "=" cuối chuỗi, gọn hơn cho cookie/header
	return base64.RawURLEncoding.EncodeToString(opaqueTokenBytes), nil
}

func (s *JwtService) HashRefreshPlain(refreshPlain string) (string, error) {
	sum := sha256.Sum256([]byte(refreshPlain))
	return base64.RawStdEncoding.EncodeToString(sum[:]), nil
}

func (s *JwtService) ParseAccessToken(token string) (string, error) {
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, domain.ErrUnauthorized
		}
		return []byte(s.secret), nil
	})
	if err != nil || !parsedToken.Valid {
		return "", domain.ErrUnauthorized
	}

	mapClaims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return "", domain.ErrUnauthorized
	}
	sub, ok := mapClaims["sub"].(string)
	if !ok || sub == "" {
		return "", domain.ErrUnauthorized
	}
	return sub, nil
}

func (s *JwtService) RefreshExpireMinutes() int {
	return s.refreshExpireMinutes
}
