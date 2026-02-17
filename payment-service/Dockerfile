FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o payment-service .

FROM alpine:latest

RUN apk add --no-cache wget

WORKDIR /app

COPY --from=builder /app/payment-service .

EXPOSE 3005

CMD ["./payment-service"]
