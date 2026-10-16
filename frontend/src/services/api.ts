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
  forgotPassword: (data: { email: string; frontendUrl?: string }) =>
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
  updateFixedExpenseMonthAmount: (
    id: string,
    data: { month: number; year: number; amount: number | null; scope?: 'month' | 'onward' | 'all'; paidAt?: string; date?: string; time?: string }
  ) => request<any>(`/fixed-expenses/${id}/month-amount`, { method: 'PATCH', body: JSON.stringify(data) }),
  createFixedExpenseAdjustment: (
    id: string,
    data: { startMonth: number; startYear: number; amount: number }
  ) => request<any>(`/fixed-expenses/${id}/adjustments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteFixedExpenseAdjustment: (id: string, adjustmentId: string) =>
    request<any>(`/fixed-expenses/${id}/adjustments/${adjustmentId}`, { method: 'DELETE' }),

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

  // Piggy Banks (Cofrinhos Estilo Banco Inter)
  getPiggyBanks: () => request<any>('/piggy-banks'),
  createPiggyBank: (data: any) =>
    request<any>('/piggy-banks', { method: 'POST', body: JSON.stringify(data) }),
  updatePiggyBank: (id: string, data: any) =>
    request<any>(`/piggy-banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePiggyBank: (id: string) =>
    request<any>(`/piggy-banks/${id}`, { method: 'DELETE' }),
  depositPiggyBank: (id: string, data: { amount: number; date?: string; description?: string; time?: string }) =>
    request<any>(`/piggy-banks/${id}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  withdrawPiggyBank: (id: string, data: { amount: number; date?: string; description?: string; time?: string }) =>
    request<any>(`/piggy-banks/${id}/withdraw`, { method: 'POST', body: JSON.stringify(data) }),

  // Credit Cards
  getCreditCards: (month?: number, year?: number) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return request<any>(`/credit-cards${query}`);
  },
  createCreditCard: (data: any) =>
    request<any>('/credit-cards', { method: 'POST', body: JSON.stringify(data) }),
  updateCreditCard: (id: string, data: any) =>
    request<any>(`/credit-cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCreditCard: (id: string) =>
    request<any>(`/credit-cards/${id}`, { method: 'DELETE' }),
  getCreditCardInvoices: (month?: number, year?: number) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return request<any>(`/credit-cards/invoices${query}`);
  },
  createCreditCardPurchase: (data: any) =>
    request<any>('/credit-cards/purchases', { method: 'POST', body: JSON.stringify(data) }),
  updateCreditCardPurchase: (id: string, data: any) =>
    request<any>(`/credit-cards/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCreditCardPurchase: (id: string) =>
    request<any>(`/credit-cards/purchases/${id}`, { method: 'DELETE' }),
  toggleCreditCardInvoicePayment: (id: string, data: { month: number; year: number; isPaid: boolean }) =>
    request<any>(`/credit-cards/${id}/invoices/toggle-payment`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateCreditCardInvoiceAdjustment: (
    id: string,
    data: { month: number; year: number; manualAdjustment: number | null }
  ) => request<any>(`/credit-cards/${id}/invoices/adjustment`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Receivables (Contas a receber)
  getReceivables: (
    monthOrFilter?: number | { month?: number; year?: number; status?: string },
    year?: number,
    status?: string
  ) => {
    const params = new URLSearchParams();
    if (typeof monthOrFilter === 'object' && monthOrFilter !== null) {
      if (monthOrFilter.month !== undefined) params.append('month', String(monthOrFilter.month));
      if (monthOrFilter.year !== undefined) params.append('year', String(monthOrFilter.year));
      if (monthOrFilter.status) params.append('status', monthOrFilter.status);
    } else {
      if (monthOrFilter !== undefined) params.append('month', String(monthOrFilter));
      if (year !== undefined) params.append('year', String(year));
      if (status) params.append('status', status);
    }
    const qs = params.toString();
    return request<any>(`/receivables${qs ? `?${qs}` : ''}`);
  },
  createReceivable: (data: any) =>
    request<any>('/receivables', { method: 'POST', body: JSON.stringify(data) }),
  updateReceivable: (id: string, data: any) =>
    request<any>(`/receivables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReceivable: (id: string) =>
    request<any>(`/receivables/${id}`, { method: 'DELETE' }),
  toggleReceivableReceived: (
    id: string,
    data: { isReceived?: boolean; receivedAt?: string; month?: number; year?: number }
  ) => request<any>(`/receivables/${id}/toggle-received`, { method: 'PATCH', body: JSON.stringify(data) }),
  adjustReceivableAmount: (
    id: string,
    data: { month: number; year: number; amount: number | null; scope: 'onward' | 'month' | 'all' }
  ) => request<any>(`/receivables/${id}/adjustment`, { method: 'PATCH', body: JSON.stringify(data) }),

  // 2FA Authentication
  verify2FA: (data: { email: string; code: string }) =>
    request<any>('/auth/verify-2fa', { method: 'POST', body: JSON.stringify(data) }),
  send2FACode: (data: { email: string }) =>
    request<any>('/auth/send-2fa-code', { method: 'POST', body: JSON.stringify(data) }),

  // Admin Dashboard API
  getAdminUsers: (params?: { search?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.status && params.status !== 'all') qs.append('status', params.status);
    if (params?.startDate) qs.append('startDate', params.startDate);
    if (params?.endDate) qs.append('endDate', params.endDate);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    const query = qs.toString();
    return request<any>(`/admin/users${query ? `?${query}` : ''}`);
  },
  updateAdminUserStatus: (id: string, status: 'active' | 'suspended' | 'pending') =>
    request<any>(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateAdminUserRole: (id: string, role: 'user' | 'admin') =>
    request<any>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  adminResetPassword: (id: string) =>
    request<any>(`/admin/users/${id}/reset-password`, { method: 'POST' }),
  deleteAdminUser: (id: string) =>
    request<any>(`/admin/users/${id}`, { method: 'DELETE' }),

  getAdminAnalytics: () => request<any>('/admin/analytics'),

  getAdminAuditLogs: (params?: { page?: number; limit?: number; action?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.action) qs.append('action', params.action);
    if (params?.search) qs.append('search', params.search);
    const query = qs.toString();
    return request<any>(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },

  getAdminErrorLogs: (params?: { page?: number; limit?: number; statusCode?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.statusCode) qs.append('statusCode', String(params.statusCode));
    if (params?.search) qs.append('search', params.search);
    const query = qs.toString();
    return request<any>(`/admin/error-logs${query ? `?${query}` : ''}`);
  },
  clearAdminErrorLogs: () => request<any>('/admin/error-logs/clear', { method: 'POST' }),

  getAdminSecurityLogs: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.status && params.status !== 'all') qs.append('status', params.status);
    if (params?.search) qs.append('search', params.search);
    const query = qs.toString();
    return request<any>(`/admin/security-logs${query ? `?${query}` : ''}`);
  },
};


