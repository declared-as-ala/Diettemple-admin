import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://145.223.118.9:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = Cookies.get('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          Cookies.remove('admin_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | undefined {
    return Cookies.get('admin_token');
  }

  // Auth
  async login(emailOrPhone: string, password: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrPhone,
      password,
    });
    return response.data;
  }

  // Level Templates (coaching)
  async getLevelTemplates(params?: { page?: number; limit?: number; search?: string; active?: string }) {
    const response = await this.client.get('/admin/level-templates', { params });
    return response.data;
  }

  async getLevelTemplate(id: string) {
    const response = await this.client.get(`/admin/level-templates/${id}`);
    return response.data;
  }

  async createLevelTemplate(data: { name: string; description?: string; isActive?: boolean }) {
    const response = await this.client.post('/admin/level-templates', data);
    return response.data;
  }

  async updateLevelTemplate(id: string, data: { name?: string; description?: string; imageUrl?: string; isActive?: boolean }) {
    const response = await this.client.put(`/admin/level-templates/${id}`, data);
    return response.data;
  }

  async updateLevelTemplateWeeks(id: string, weeks: unknown[]) {
    const response = await this.client.put(`/admin/level-templates/${id}/weeks`, { weeks });
    return response.data;
  }

  async deleteLevelTemplate(id: string) {
    const response = await this.client.delete(`/admin/level-templates/${id}`);
    return response.data;
  }

  // Session Templates (coaching)
  async getSessionTemplates(params?: { page?: number; limit?: number; search?: string; difficulty?: string }) {
    const response = await this.client.get('/admin/session-templates', { params });
    return response.data;
  }

  async getSessionTemplate(id: string) {
    const response = await this.client.get(`/admin/session-templates/${id}`);
    return response.data;
  }

  async createSessionTemplate(data: any) {
    const response = await this.client.post('/admin/session-templates', data);
    return response.data;
  }

  async updateSessionTemplate(id: string, data: any) {
    const response = await this.client.put(`/admin/session-templates/${id}`, data);
    return response.data;
  }

  async deleteSessionTemplate(id: string) {
    const response = await this.client.delete(`/admin/session-templates/${id}`);
    return response.data;
  }

  // Products
  async getProducts(params?: { page?: number; limit?: number; search?: string; category?: string }) {
    const response = await this.client.get('/admin/products', { params });
    return response.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/admin/products/${id}`);
    return response.data;
  }

  async createProduct(data: any) {
    const response = await this.client.post('/admin/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: any) {
    const response = await this.client.put(`/admin/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string) {
    const response = await this.client.delete(`/admin/products/${id}`);
    return response.data;
  }

  async updateProductImages(id: string, images: string[]) {
    const response = await this.client.post(`/admin/products/${id}/images`, { images });
    return response.data;
  }

  async getCategories() {
    const response = await this.client.get('/admin/products/categories');
    return response.data;
  }

  // Orders
  async getOrders(params?: { page?: number; limit?: number; status?: string; paymentStatus?: string }) {
    const response = await this.client.get('/admin/orders', { params });
    return response.data;
  }

  async getOrder(id: string) {
    const response = await this.client.get(`/admin/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(id: string, status: string) {
    const response = await this.client.put(`/admin/orders/${id}/status`, { status });
    return response.data;
  }

  async updatePaymentStatus(id: string, paymentStatus: string) {
    const response = await this.client.put(`/admin/orders/${id}/payment-status`, { paymentStatus });
    return response.data;
  }

  // Users
  async getUsers(
    params?: { page?: number; limit?: number; search?: string },
    options?: { signal?: AbortSignal }
  ) {
    const response = await this.client.get('/admin/users', { params, signal: options?.signal });
    return response.data;
  }

  async getUser(id: string) {
    const response = await this.client.get(`/admin/users/${id}`);
    return response.data;
  }

  async disableUser(id: string) {
    const response = await this.client.put(`/admin/users/${id}/disable`);
    return response.data;
  }

  async createUser(data: { name?: string; email?: string; phone?: string; password: string; level?: string }) {
    const response = await this.client.post('/admin/users', data);
    return response.data;
  }

  async updateUser(id: string, data: { name?: string; email?: string; phone?: string; level?: string; password?: string }) {
    const response = await this.client.put(`/admin/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/admin/users/${id}`);
    return response.data;
  }

  // Dashboard
  async getDashboardStats(params?: { range?: string }) {
    const response = await this.client.get('/admin/dashboard/stats', { params: params || { range: '30d' } });
    return response.data;
  }

  async getDashboardCharts(params?: { range?: string }) {
    const response = await this.client.get('/admin/dashboard/charts', { params: params || { range: '30d' } });
    return response.data;
  }

  // Subscriptions
  async getSubscriptions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    levelTemplateId?: string;
    searchUser?: string;
    expiringSoonDays?: number;
  }) {
    const response = await this.client.get('/admin/subscriptions', { params });
    return response.data;
  }

  async getSubscription(id: string) {
    const response = await this.client.get(`/admin/subscriptions/${id}`);
    return response.data;
  }

  async assignSubscription(data: {
    userId: string;
    levelTemplateId: string;
    startAt: string;
    endAt: string;
    note?: string;
  }) {
    const response = await this.client.post('/admin/subscriptions/assign', data);
    return response.data;
  }

  async renewSubscription(id: string, data: { newEndAt: string; note?: string }) {
    const response = await this.client.put(`/admin/subscriptions/${id}/renew`, data);
    return response.data;
  }

  async changeSubscriptionLevel(
    id: string,
    data: { newLevelTemplateId: string; keepDates?: boolean; newEndAt?: string; note?: string }
  ) {
    const response = await this.client.put(`/admin/subscriptions/${id}/change-level`, data);
    return response.data;
  }

  async cancelSubscription(id: string, data?: { note?: string }) {
    const response = await this.client.put(`/admin/subscriptions/${id}/cancel`, data || {});
    return response.data;
  }

  // Assignments board
  async getAssignmentsBoard(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const response = await this.client.get('/admin/assignments/board', { params });
    return response.data;
  }

  // Clients (coaching)
  async getClients(
    params?: { segment?: string; search?: string; page?: number; limit?: number },
    options?: { signal?: AbortSignal }
  ) {
    const response = await this.client.get('/admin/clients', { params, signal: options?.signal });
    return response.data;
  }

  async getClient(id: string) {
    const response = await this.client.get(`/admin/clients/${id}`);
    return response.data;
  }

  async createClient(data: { name?: string; email?: string; phone?: string; password: string }) {
    const response = await this.client.post('/admin/clients', data);
    return response.data;
  }

  async getClientPlan(clientId: string) {
    const response = await this.client.get(`/admin/clients/${clientId}/plan`);
    return response.data;
  }

  async getClientNutrition(clientId: string) {
    const response = await this.client.get(`/admin/clients/${clientId}/nutrition`);
    return response.data;
  }

  async getClientTimeline(clientId: string, params?: { limit?: number }) {
    const response = await this.client.get(`/admin/clients/${clientId}/timeline`, { params });
    return response.data;
  }

  async addCoachNote(clientId: string, data: { date: string; message: string; title?: string }) {
    const response = await this.client.post(`/admin/clients/${clientId}/coach-note`, data);
    return response.data;
  }

  async getDashboardInactive(params?: { days?: number }) {
    const response = await this.client.get('/admin/dashboard/inactive', { params: params || { days: 7 } });
    return response.data;
  }

  // Nutrition plans
  async getNutritionPlans() {
    const response = await this.client.get('/admin/nutrition-plans');
    return response.data;
  }

  async getNutritionPlan(id: string) {
    const response = await this.client.get(`/admin/nutrition-plans/${id}`);
    return response.data;
  }

  async createNutritionPlan(data: {
    name: string;
    description?: string;
    goalType: string;
    dailyCalories: number;
    macros: { proteinG: number; carbsG: number; fatG: number };
    mealsTemplate?: Array<{ title: string; targetCalories: number; items: Array<{ name: string; calories: number; proteinG?: number; carbsG?: number; fatG?: number; notes?: string }> }>;
  }) {
    const response = await this.client.post('/admin/nutrition-plans', data);
    return response.data;
  }

  async updateNutritionPlan(id: string, data: Partial<{
    name: string;
    description: string;
    goalType: string;
    dailyCalories: number;
    macros: { proteinG: number; carbsG: number; fatG: number };
    mealsTemplate: Array<{ title: string; targetCalories: number; items: Array<{ name: string; calories: number; proteinG?: number; carbsG?: number; fatG?: number; notes?: string }> }>;
  }>) {
    const response = await this.client.put(`/admin/nutrition-plans/${id}`, data);
    return response.data;
  }

  async deleteNutritionPlan(id: string) {
    const response = await this.client.delete(`/admin/nutrition-plans/${id}`);
    return response.data;
  }

  async assignNutritionPlan(data: { userId: string; nutritionPlanTemplateId: string; startAt: string; endAt: string; overrides?: { dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number; notes?: string } }) {
    const response = await this.client.post('/admin/nutrition-assignments/assign', data);
    return response.data;
  }

  async getNutritionAssignments(params?: { page?: number; limit?: number; status?: string; searchUser?: string }) {
    const response = await this.client.get('/admin/nutrition-assignments', { params });
    return response.data;
  }

  async updateNutritionAssignment(
    assignmentId: string,
    adjustments: { dailyCalories?: number; proteinG?: number; carbsG?: number; fatG?: number; notes?: string }
  ) {
    const response = await this.client.patch(`/admin/nutrition-assignments/${assignmentId}`, { adjustments });
    return response.data;
  }

  // Programs
  async getPrograms(params?: { page?: number; limit?: number; status?: string }) {
    const response = await this.client.get('/admin/programs', { params });
    return response.data;
  }

  async getProgram(id: string) {
    const response = await this.client.get(`/admin/programs/${id}`);
    return response.data;
  }

  async updateProgramStatus(id: string, status: string) {
    const response = await this.client.put(`/admin/programs/${id}/status`, { status });
    return response.data;
  }

  // Levels
  async getUsersByLevel(params?: { level?: string; page?: number; limit?: number }) {
    const response = await this.client.get('/admin/users/levels', { params });
    return response.data;
  }

  async updateUserLevel(userId: string, level: string) {
    const response = await this.client.put(`/admin/users/${userId}/level`, { level });
    return response.data;
  }

  // Workouts
  async getWorkouts(params?: { page?: number; limit?: number; status?: string; userId?: string }) {
    const response = await this.client.get('/admin/workouts', { params });
    return response.data;
  }

  async getWorkout(id: string) {
    const response = await this.client.get(`/admin/workouts/${id}`);
    return response.data;
  }

  // Exercises
  async getExercises(
    params?: { page?: number; limit?: number; search?: string; muscleGroup?: string; difficulty?: string; equipment?: string; hasVideo?: string },
    options?: { signal?: AbortSignal }
  ) {
    const response = await this.client.get('/admin/exercises', { params, signal: options?.signal });
    return response.data;
  }

  async getExercise(id: string) {
    const response = await this.client.get(`/admin/exercises/${id}`);
    return response.data;
  }

  async createExercise(data: any) {
    const response = await this.client.post('/admin/exercises', data);
    return response.data;
  }

  async updateExercise(id: string, data: any) {
    const response = await this.client.put(`/admin/exercises/${id}`, data);
    return response.data;
  }

  async updateExerciseVideo(id: string, videoFile: File, onUploadProgress?: (percent: number) => void) {
    const formData = new FormData();
    formData.append('video', videoFile);
    const token = this.getToken();
    const response = await axios.post(
      `${API_BASE_URL}/admin/exercises/${id}/video`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
        onUploadProgress: onUploadProgress
          ? (e) => {
              const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
              onUploadProgress(percent);
            }
          : undefined,
      }
    );
    return response.data;
  }

  async getMuscleGroups() {
    const response = await this.client.get('/admin/exercises/muscle-groups');
    return response.data;
  }

  // Sessions
  async getSessions(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get('/admin/sessions', { params });
    return response.data;
  }

  async getSession(id: string) {
    const response = await this.client.get(`/admin/sessions/${id}`);
    return response.data;
  }

  async createSession(data: any) {
    const response = await this.client.post('/admin/sessions', data);
    return response.data;
  }

  async updateSession(id: string, data: any) {
    const response = await this.client.put(`/admin/sessions/${id}`, data);
    return response.data;
  }

  async deleteSession(id: string) {
    const response = await this.client.delete(`/admin/sessions/${id}`);
    return response.data;
  }

  // Weekly Templates
  async getWeeklyTemplates(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/admin/weekly-templates', { params });
    return response.data;
  }

  async createWeeklyTemplate(data: any) {
    const response = await this.client.post('/admin/weekly-templates', data);
    return response.data;
  }

  async updateWeeklyTemplate(id: string, data: any) {
    const response = await this.client.put(`/admin/weekly-templates/${id}`, data);
    return response.data;
  }

  // Client Analytics
  async getClientAnalytics(userId: string) {
    const response = await this.client.get(`/admin/clients/${userId}/analytics`);
    return response.data;
  }

  async assignProgramToClient(userId: string, data: { weeklyTemplateId: string; startDate: string; durationWeeks: number }) {
    const response = await this.client.post(`/admin/clients/${userId}/assign-program`, data);
    return response.data;
  }

  // Admin Recipes (reels / video)
  async getAdminRecipes() {
    const response = await this.client.get('/admin/recipes');
    return response.data;
  }

  async getAdminRecipe(id: string) {
    const response = await this.client.get(`/admin/recipes/${id}`);
    return response.data;
  }

  async updateAdminRecipe(
    id: string,
    data: {
      title?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      imageUrl?: string;
      tags?: string[];
      videoSource?: 'upload' | 'youtube';
      videoUrl?: string;
      posterUrl?: string;
      ingredients?: string[];
    }
  ) {
    const response = await this.client.put(`/admin/recipes/${id}`, data);
    return response.data;
  }

  // Role Management
  async getUsersWithRoles(params?: { page?: number; limit?: number; role?: string; search?: string }) {
    const response = await this.client.get('/admin/users/roles', { params });
    return response.data;
  }

  async updateUserRole(userId: string, role: 'user' | 'admin' | 'coach' | 'nutritionist') {
    const response = await this.client.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  }

  async revokeUserRole(userId: string) {
    const response = await this.client.delete(`/admin/users/${userId}/role`);
    return response.data;
  }
}

export const api = new ApiClient();
