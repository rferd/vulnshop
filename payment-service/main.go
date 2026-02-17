package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// VULNERABILITY: Hardcoded API keys in source code
const (
	// VULNERABILITY: Hardcoded Stripe API key
	StripeAPIKey = "sk_test_vulnerable_key_12345"
	// VULNERABILITY: Hardcoded AWS credentials
	AWSAccessKey = "AKIAIOSFODNN7EXAMPLE"
	AWSSecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
)

// Payment represents a payment transaction
type Payment struct {
	ID           string    `json:"id"`
	OrderID      string    `json:"order_id"`
	UserID       string    `json:"user_id"`
	Amount       float64   `json:"amount"`
	// VULNERABILITY: Storing full credit card number
	CardNumber   string    `json:"card_number"`
	CardHolder   string    `json:"card_holder"`
	CVV          string    `json:"cvv"`
	ExpiryDate   string    `json:"expiry_date"`
	Status       string    `json:"status"`
	ProcessedAt  time.Time `json:"processed_at"`
}

// In-memory storage for tracking payment processing
// VULNERABILITY: Race condition - no proper locking mechanism
var (
	processedPayments = make(map[string]bool)
	paymentMutex      sync.Mutex
	payments          = make(map[string]*Payment)
)

// Health check handler
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "healthy",
		"service": "payment-service",
	})
}

// Process payment handler
func processPaymentHandler(w http.ResponseWriter, r *http.Request) {
	var payment Payment
	
	if err := json.NewDecoder(r.Body).Decode(&payment); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Generate payment ID
	payment.ID = fmt.Sprintf("PAY-%d", time.Now().Unix())
	payment.ProcessedAt = time.Now()
	payment.Status = "processing"

	// VULNERABILITY: Sensitive data exposure - logging credit card numbers in plaintext
	log.Printf("Processing payment: ID=%s, OrderID=%s, Amount=%.2f, Card=%s, CVV=%s, Holder=%s",
		payment.ID, payment.OrderID, payment.Amount, payment.CardNumber, payment.CVV, payment.CardHolder)

	// VULNERABILITY: Race condition in payment processing (double-spend vulnerability)
	// Multiple concurrent requests with the same order_id can be processed
	// No proper locking or transaction handling
	
	// Weak check for duplicate payments
	paymentMutex.Lock()
	alreadyProcessed := processedPayments[payment.OrderID]
	if !alreadyProcessed {
		processedPayments[payment.OrderID] = true
	}
	paymentMutex.Unlock()

	if alreadyProcessed {
		// VULNERABILITY: Race condition - this check is not atomic
		http.Error(w, "Payment already processed", http.StatusConflict)
		return
	}

	// Simulate payment processing delay
	// VULNERABILITY: Race condition window - another request can slip through
	time.Sleep(100 * time.Millisecond)

	// Process payment
	payment.Status = "completed"
	
	// Store payment
	paymentMutex.Lock()
	payments[payment.ID] = &payment
	paymentMutex.Unlock()

	// VULNERABILITY: Sensitive data in response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Payment processed successfully",
		"payment": payment,
		// VULNERABILITY: Exposing internal API keys
		"api_key_used": StripeAPIKey,
	})
}

// Get payment handler
func getPaymentHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	paymentID := vars["id"]

	// VULNERABILITY: No authentication check - anyone can view any payment
	paymentMutex.Lock()
	payment, exists := payments[paymentID]
	paymentMutex.Unlock()

	if !exists {
		http.Error(w, "Payment not found", http.StatusNotFound)
		return
	}

	// VULNERABILITY: Exposing full payment details including card numbers
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}

// List all payments handler
func listPaymentsHandler(w http.ResponseWriter, r *http.Request) {
	// VULNERABILITY: No authentication - anyone can list all payments
	// VULNERABILITY: Exposing all payment data including sensitive card info
	
	paymentMutex.Lock()
	allPayments := make([]*Payment, 0, len(payments))
	for _, payment := range payments {
		allPayments = append(allPayments, payment)
	}
	paymentMutex.Unlock()

	// VULNERABILITY: Logging sensitive payment information
	log.Printf("Listing all payments: %d total payments", len(allPayments))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count":    len(allPayments),
		"payments": allPayments,
	})
}

// Refund payment handler
func refundPaymentHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	paymentID := vars["id"]

	// VULNERABILITY: No authentication or authorization check
	// Anyone can refund any payment
	
	paymentMutex.Lock()
	payment, exists := payments[paymentID]
	if exists {
		payment.Status = "refunded"
		// VULNERABILITY: No actual refund processing
	}
	paymentMutex.Unlock()

	if !exists {
		http.Error(w, "Payment not found", http.StatusNotFound)
		return
	}

	// VULNERABILITY: Insufficient logging of security-relevant events
	// No detailed audit trail for refunds
	log.Printf("Payment refunded: %s", paymentID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Payment refunded",
		"payment": payment,
	})
}

// Config endpoint - VULNERABILITY: Exposing configuration and secrets
func configHandler(w http.ResponseWriter, r *http.Request) {
	config := map[string]string{
		// VULNERABILITY: Exposing hardcoded API keys
		"stripe_api_key": StripeAPIKey,
		"aws_access_key": AWSAccessKey,
		"aws_secret_key": AWSSecretKey,
		"service":        "payment-service",
		"version":        "1.0.0",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func main() {
	router := mux.NewRouter()

	// Routes
	router.HandleFunc("/health", healthHandler).Methods("GET")
	router.HandleFunc("/api/payments", processPaymentHandler).Methods("POST")
	router.HandleFunc("/api/payments", listPaymentsHandler).Methods("GET")
	router.HandleFunc("/api/payments/{id}", getPaymentHandler).Methods("GET")
	router.HandleFunc("/api/payments/{id}/refund", refundPaymentHandler).Methods("POST")
	router.HandleFunc("/config", configHandler).Methods("GET")

	// Also expose without /api prefix
	router.HandleFunc("/payments", processPaymentHandler).Methods("POST")
	router.HandleFunc("/payments", listPaymentsHandler).Methods("GET")
	router.HandleFunc("/payments/{id}", getPaymentHandler).Methods("GET")
	router.HandleFunc("/payments/{id}/refund", refundPaymentHandler).Methods("POST")

	port := os.Getenv("PORT")
	if port == "" {
		port = "3005"
	}

	// VULNERABILITY: No TLS/HTTPS enforcement
	// Sensitive payment data transmitted over plain HTTP
	
	log.Printf("💳 Payment Service running on port %s", port)
	log.Println("⚠️  WARNING: This service is intentionally vulnerable!")
	log.Printf("⚠️  Using Stripe API Key: %s", StripeAPIKey)
	
	// VULNERABILITY: No rate limiting, no security middleware
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal(err)
	}
}
