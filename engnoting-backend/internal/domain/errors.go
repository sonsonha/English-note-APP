package domain

import "errors"

var (
	ErrWordNotFound         = errors.New("word not found")
	ErrBadRequest           = errors.New("bad request")
	ErrWordAlreadyExists    = errors.New("word already exists for this user")
	ErrUserNotFound         = errors.New("user not found")
	ErrEmailAlreadyExists   = errors.New("email already exists")
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrUnauthorized         = errors.New("unauthorized")
	ErrForbidden            = errors.New("forbidden")
	ErrInternalServerError  = errors.New("internal server error")
	ErrExpiredRefreshToken  = errors.New("expired refresh token")
	ErrRevokedRefreshToken  = errors.New("revoked refresh token")
	ErrReplacedRefreshToken = errors.New("replaced refresh token")
	DebugError              = errors.New("debug error refresh session")
)
