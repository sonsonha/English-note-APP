package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL             string
	Port                    string
	AIAPIKey                string
	AIProvider              string
	JWTSecretCurrent        string
	JWTSecretPrevious       string
	JWTAccessExpireMinutes  int
	JWTRefreshExpireMinutes int
	JWTTokenTypeAccess      string
	JWTTokenTypeRefresh     string
}

// Main function to load config
// func LoadConfig() *Config {
// 	return &Config{
// 		DatabaseURL: mustEnv("DATABASE_URL"),
// 		Port:        envOr("PORT", "8080"),
// 		AIAPIKey:    os.Getenv("AI_API_KEY"),
// 		AIProvider:  envOr("AI_PROVIDER", "openai"),
// 	}
// }

func envIntOr(key string, defaultValue int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultValue
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return defaultValue
	}
	return n
}

// Development config
func LoadConfigDev() *Config {
	_ = godotenv.Load()
	return &Config{
		DatabaseURL:             mustEnv("DATABASE_URL"),
		Port:                    envOr("PORT", "8080"),
		AIAPIKey:                os.Getenv("AI_API_KEY"),
		AIProvider:              envOr("AI_PROVIDER", "openai"),
		JWTSecretCurrent:        mustEnv("JWT_SECRET_CURRENT"),
		JWTSecretPrevious:       mustEnv("JWT_SECRET_PREVIOUS"),
		JWTAccessExpireMinutes:  envIntOr("JWT_ACCESS_EXPIRE_MINUTES", 15),
		JWTRefreshExpireMinutes: envIntOr("JWT_REFRESH_EXPIRE_MINUTES", 1440),
		JWTTokenTypeAccess:      "access",
		JWTTokenTypeRefresh:     "refresh",
	}
}

func mustEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic("missing env:" + key)
	}
	return value
}

func envOr(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
