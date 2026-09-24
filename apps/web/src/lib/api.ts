const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const body = (await response.json()) as ApiResponse<T> | ApiError;

  if (!response.ok || !body.success) {
    const error = body as ApiError;
    throw new ApiClientError(
      error.error?.message ?? 'An unexpected error occurred',
      error.error?.code ?? 'UNKNOWN_ERROR',
      response.status,
    );
  }

  return (body as ApiResponse<T>).data;
}

// ── Auth API ────────────────────────────────────

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export const authApi = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) => request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getProfile: () => request<AuthUser>('/users/me'),
};

// ── Users API ───────────────────────────────────

export const usersApi = {
  getAll: (params?: { role?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<{ users: AuthUser[]; total: number }>(`/users${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => request<AuthUser>(`/users/${id}`),
};

// ── Students API ────────────────────────────────

export interface StudentProfile {
  _id: string;
  userId: string;
  rollNumber: string;
  branch: string;
  graduationYear: number;
  cgpa: number;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  activeBacklogs: number;
  totalBacklogs: number;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  completionPercentage: number;
}

export const studentsApi = {
  getProfile: () => request<StudentProfile>('/students/me'),
  updateProfile: (data: Partial<StudentProfile>) =>
    request<StudentProfile>('/students/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getCompletion: () => request<{ percentage: number; missingFields: string[] }>('/students/me/completion'),
};

// ── Evidence API ────────────────────────────────

export interface EvidenceItem {
  _id: string;
  studentId: string;
  title: string;
  type: string;
  description?: string;
  claimedSkills: string[];
  status: string;
  fileUrl: string;
  originalFileName: string;
  createdAt: string;
  aiAnalysis?: {
    decision: string;
    reasons: string[];
  };
}

export const evidenceApi = {
  getMyEvidence: (params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<{ evidence: EvidenceItem[]; total: number }>(`/evidence/my${query ? `?${query}` : ''}`);
  },
  
  getStats: () => request<Record<string, number>>('/evidence/my/stats'),

  upload: async (formData: FormData) => {
    // We cannot use the standard request function for FormData because of Content-Type header
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const response = await fetch(`${API_BASE_URL}/api/evidence`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    
    const body = await response.json();
    if (!response.ok || !body.success) {
      throw new ApiClientError(
        body.error?.message ?? 'An unexpected error occurred',
        body.error?.code ?? 'UNKNOWN_ERROR',
        response.status,
      );
    }
    return body.data as EvidenceItem;
  },

  delete: (id: string) => request<{ message: string }>(`/evidence/${id}`, { method: 'DELETE' }),
};

// ── Faculty API ─────────────────────────────────

export interface ReviewItem {
  _id: string;
  evidenceId: {
    _id: string;
    title: string;
    type: string;
    fileUrl: string;
    studentId: {
      _id: string;
      email: string;
      firstName: string;
      lastName: string;
    }
  };
  facultyId: string;
  status: string;
  decision?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export const facultyApi = {
  getPendingReviews: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<{ reviews: ReviewItem[]; total: number }>(`/faculty/reviews/pending${query ? `?${query}` : ''}`);
  },

  getStats: () => request<{ pending: number; completed: number; total: number }>('/faculty/stats'),

  submitReviewDecision: (data: { reviewId: string; decision: 'APPROVED' | 'REJECTED'; comments?: string }) => 
    request<ReviewItem>('/faculty/reviews/decision', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const studentApplicationsApi = {
  checkEligibility: (driveId: string) => request<{ isEligible: boolean; reasons: string[] }>(`/applications/eligibility/${driveId}`),
  applyForDrive: (driveId: string, notes?: string) => request<any>('/applications', {
    method: 'POST',
    body: JSON.stringify({ driveId, notes }),
  }),
};

export const officerApi = {
  // Drives
  createDrive: (data: any) => request<any>('/drives', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getDrives: (params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<{ drives: any[]; total: number }>(`/drives${query ? `?${query}` : ''}`);
  },
  getDrive: (id: string) => request<any>(`/drives/${id}`),
  updateDriveStatus: (id: string, status: string) => request<any>(`/drives/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  
  // Applications
  getApplications: (params?: { driveId?: string; status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.driveId) searchParams.set('driveId', params.driveId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<{ applications: any[]; total: number }>(`/applications${query ? `?${query}` : ''}`);
  },
  updateApplicationStatus: (id: string, status: string) => request<any>(`/applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
};

export { ApiClientError };
export type { ApiResponse, ApiError, AuthTokens, AuthUser, AuthResponse };
