migrate-up:
	migrate -source file://migrations -database $(DATABASE_URL) up
migrate-down:
	migrate -source file://migrations -database $(DATABASE_URL) down
migrate-version:
	migrate -source file://migrations -database $(DATABASE_URL) version
