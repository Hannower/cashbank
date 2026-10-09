const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken(): string | null {
  return localStorage.getItem('cashbank_token');
}

export function setToken(token: string): void {
  localStorage.setItem('cashbank_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('cashbank_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    // Dispatch auth-logout event if token expired
    window.dispatchEvent(new Event('cashbank-auth-logout'));
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição');
  }

  return data as T;
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/auth/me'),
  updateSavingsGoal: (savingsGoal: number) =>
    request<any>('/auth/savings-goal', { method: 'PATCH', body: JSON.stringify({ savingsGoal }) }),
  verifyResetEmail: (data: { email: string }) =>
    request<any>('/auth/verify-reset-email', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data: { email: string; newPassword: string }) =>
    request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data: { email: string }) =>
    request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  verifyResetToken: (data: { token: string }) =>
    request<any>('/auth/verify-reset-token', { method: 'POST', body: JSON.stringify(data) }),
  resetPasswordWithToken: (data: { token: string; newPassword: string }) =>
    request<any>('/auth/reset-password-with-token', { method: 'POST', body: JSON.stringify(data) }),
  updateProfile: (data: { name?: string; email?: string }) =>
    request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<any>('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  getDashboard: (month?: number, year?: number) => {
    const now = new Date();
    const m = month !== undefined ? month : (now.getMonth() + 1);
    const y = year !== undefined ? year : now.getFullYear();
    return request<any>(`/dashboard/overview?month=${m}&year=${y}`);
  },
  getDashboardAnnual: (year?: number) => {
    const y = year !== undefined ? year : new Date().getFullYear();
    return request<any>(`/dashboard/annual?year=${y}`);
  },

  // Fixed Expenses
  getFixedExpenses: (month?: number, year?: number) => {
    const now = new Date();
    const m = month !== undefined ? month : (now.getMonth() + 1);
    const y = year !== undefined ? year : now.getFullYear();
    return request<any>(`/fixed-expenses?month=${m}&year=${y}`);
  },
  createFixedExpense: (data: any) =>
    request<any>('/fixed-expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateFixedExpense: (id: string, data: any) =>
    request<any>(`/fixed-expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFixedExpense: (id: string) =>
    request<any>(`/fixed-expenses/${id}`, { method: 'DELETE' }),
  toggleFixedExpensePayment: (id: string, data: { month: number; year: number; isPaid: boolean }) =>
    request<any>(`/fixed-expenses/${id}/toggle-payment`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateFixedExpenseMonthAmount: (id: string, data: { month: number; year: number; amount: number | null }) =>
    request<any>(`/fixed-expenses/${id}/month-amount`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Variable Expenses
  getVariableExpenses: (month?: number, year?: number) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return request<any>(`/variable-expenses${query}`);
  },
  createVariableExpense: (data: any) =>
    request<any>('/variable-expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateVariableExpense: (id: string, data: any) =>
    request<any>(`/variable-expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVariableExpense: (id: string) =>
    request<any>(`/variable-expenses/${id}`, { method: 'DELETE' }),

  // Revenues
  getRevenues: (month?: number, year?: number) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return request<any>(`/revenues${query}`);
  },
  createRevenue: (data: any) =>
    request<any>('/revenues', { method: 'POST', body: JSON.stringify(data) }),
  updateRevenue: (id: string, data: any) =>
    request<any>(`/revenues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRevenue: (id: string) =>
    request<any>(`/revenues/${id}`, { method: 'DELETE' }),

  // Savings
  getSavings: () => request<any>('/savings'),
  createSavings: (data: any) =>
    request<any>('/savings', { method: 'POST', body: JSON.stringify(data) }),
  updateSavings: (id: string, data: any) =>
    request<any>(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavings: (id: string) =>
    request<any>(`/savings/${id}`, { method: 'DELETE' }),
};
