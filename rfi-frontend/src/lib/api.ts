const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class QuantXAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API request failed");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Health check
  async getHealth() {
    return this.request("/health");
  }

  // Get payments for a user
  async getPaymentsByUser(address: string, offset: number = 0, limit: number = 10) {
    return this.request(
      `/api/payments/user/${address}?offset=${offset}&limit=${limit}`,
    );
  }

  // Get single payment
  async getPayment(paymentId: number) {
    return this.request(`/api/payments/${paymentId}`);
  }

  // Get payment status
  async getPaymentStatus(paymentId: number) {
    return this.request(`/api/payments/${paymentId}/status`);
  }

  // Get payment execution history
  async getPaymentHistory(paymentId: number) {
    return this.request(`/api/payments/${paymentId}/history`);
  }

  // Get executor statistics
  async getExecutorStats() {
    return this.request("/api/executor/stats");
  }

  // Get execution history
  async getExecutionHistory() {
    return this.request("/api/executor/history");
  }

  // Manual trigger execution (for testing)
  async triggerExecution(paymentId: number) {
    return this.request(`/api/executor/trigger/${paymentId}`, {
      method: "POST",
    });
  }
}

export default new QuantXAPI();

