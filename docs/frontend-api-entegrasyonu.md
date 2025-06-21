# 🔌 GreenAI Forum - Frontend API Entegrasyonu

## 📡 Backend API Genel Bakış

Mevcut backend API: `http://localhost:5000/api`

### 🎯 Mevcut Endpoint'ler

#### Forum API
```
GET  /api/forum/categories     # Forum kategorileri
GET  /api/forum/topics         # Forum konuları
GET  /api/forum/search?q=...   # Konu arama
```

#### E-ticaret API
```
GET  /api/ecommerce/products      # Ürün listesi
GET  /api/ecommerce/categories    # Ürün kategorileri
GET  /api/ecommerce/stats         # E-ticaret istatistikleri
```

#### AI Asistan API
```
GET  /api/ai/status            # AI servis durumu
POST /api/ai/ask               # AI'ya soru sor (Auth gerekli)
GET  /api/ai/suggestions       # AI önerileri (Auth gerekli)
```

#### Üyelik API
```
GET  /api/membership/plans     # Üyelik planları
GET  /api/membership/current   # Mevcut üyelik (Auth gerekli)
```

## 🏗️ Service Layer Mimarisi

### API Client Konfigürasyonu
```typescript
// lib/api-client.ts
import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Forum Service
```typescript
// services/forum-service.ts
import apiClient from '@/lib/api-client';
import { Category, Topic, TopicFilters, PaginatedResponse } from '@/types/forum.types';

export const forumService = {
  // Kategorileri getir
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get('/forum/categories');
    return response.data.data;
  },

  // Konuları getir
  async getTopics(filters?: TopicFilters): Promise<PaginatedResponse<Topic>> {
    const params = new URLSearchParams();
    
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/forum/topics?${params}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Konu ara
  async searchTopics(query: string, page = 1): Promise<PaginatedResponse<Topic>> {
    const response = await apiClient.get(`/forum/search?q=${encodeURIComponent(query)}&page=${page}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Konu oluştur (gelecekte eklenecek)
  async createTopic(topicData: CreateTopicData): Promise<Topic> {
    const response = await apiClient.post('/forum/topics', topicData);
    return response.data.data;
  },

  // Konu detayını getir (gelecekte eklenecek)
  async getTopic(slug: string): Promise<Topic> {
    const response = await apiClient.get(`/forum/topics/${slug}`);
    return response.data.data;
  },
};
```

### E-ticaret Service
```typescript
// services/ecommerce-service.ts
import apiClient from '@/lib/api-client';
import { Product, ProductCategory, ProductFilters, PaginatedResponse } from '@/types/ecommerce.types';

export const ecommerceService = {
  // Ürünleri getir
  async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/ecommerce/products?${params}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Ürün kategorilerini getir
  async getCategories(): Promise<ProductCategory[]> {
    const response = await apiClient.get('/ecommerce/categories');
    return response.data.data;
  },

  // E-ticaret istatistiklerini getir
  async getStats(): Promise<EcommerceStats> {
    const response = await apiClient.get('/ecommerce/stats');
    return response.data.data;
  },

  // Ürün detayını getir (gelecekte eklenecek)
  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get(`/ecommerce/products/${id}`);
    return response.data.data;
  },
};
```

### AI Service
```typescript
// services/ai-service.ts
import apiClient from '@/lib/api-client';
import { AIResponse, AIQuestion, AISuggestion } from '@/types/ai.types';

export const aiService = {
  // AI servis durumunu getir
  async getStatus(): Promise<AIStatus> {
    const response = await apiClient.get('/ai/status');
    return response.data.data;
  },

  // AI'ya soru sor
  async askQuestion(questionData: AIQuestion): Promise<AIResponse> {
    const response = await apiClient.post('/ai/ask', questionData);
    return response.data.data;
  },

  // AI önerilerini getir
  async getSuggestions(): Promise<AISuggestion[]> {
    const response = await apiClient.get('/ai/suggestions');
    return response.data.data;
  },
};
```

### Üyelik Service
```typescript
// services/membership-service.ts
import apiClient from '@/lib/api-client';
import { MembershipPlan, CurrentMembership } from '@/types/membership.types';

export const membershipService = {
  // Üyelik planlarını getir
  async getPlans(): Promise<MembershipPlan[]> {
    const response = await apiClient.get('/membership/plans');
    return response.data.data;
  },

  // Mevcut üyelik bilgilerini getir
  async getCurrentMembership(): Promise<CurrentMembership> {
    const response = await apiClient.get('/membership/current');
    return response.data.data;
  },

  // Üyelik yükselt (gelecekte eklenecek)
  async upgradeMembership(planId: string): Promise<UpgradeResponse> {
    const response = await apiClient.post('/membership/upgrade', { planId });
    return response.data.data;
  },
};
```

## 🔗 React Query Entegrasyonu

### Query Keys
```typescript
// lib/query-keys.ts
export const queryKeys = {
  // Forum
  forum: {
    all: ['forum'] as const,
    categories: () => [...queryKeys.forum.all, 'categories'] as const,
    topics: (filters?: TopicFilters) => [...queryKeys.forum.all, 'topics', filters] as const,
    topic: (slug: string) => [...queryKeys.forum.all, 'topic', slug] as const,
    search: (query: string, page?: number) => [...queryKeys.forum.all, 'search', query, page] as const,
  },
  
  // E-commerce
  ecommerce: {
    all: ['ecommerce'] as const,
    products: (filters?: ProductFilters) => [...queryKeys.ecommerce.all, 'products', filters] as const,
    product: (id: string) => [...queryKeys.ecommerce.all, 'product', id] as const,
    categories: () => [...queryKeys.ecommerce.all, 'categories'] as const,
    stats: () => [...queryKeys.ecommerce.all, 'stats'] as const,
  },
  
  // AI
  ai: {
    all: ['ai'] as const,
    status: () => [...queryKeys.ai.all, 'status'] as const,
    suggestions: () => [...queryKeys.ai.all, 'suggestions'] as const,
  },
  
  // Membership
  membership: {
    all: ['membership'] as const,
    plans: () => [...queryKeys.membership.all, 'plans'] as const,
    current: () => [...queryKeys.membership.all, 'current'] as const,
  },
} as const;
```

### Custom Hooks
```typescript
// hooks/use-forum.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumService } from '@/services/forum-service';
import { queryKeys } from '@/lib/query-keys';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.forum.categories(),
    queryFn: forumService.getCategories,
    staleTime: 5 * 60 * 1000, // 5 dakika
  });
}

export function useTopics(filters?: TopicFilters) {
  return useQuery({
    queryKey: queryKeys.forum.topics(filters),
    queryFn: () => forumService.getTopics(filters),
    keepPreviousData: true,
  });
}

export function useSearchTopics(query: string, page = 1) {
  return useQuery({
    queryKey: queryKeys.forum.search(query, page),
    queryFn: () => forumService.searchTopics(query, page),
    enabled: query.length >= 2,
    keepPreviousData: true,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: forumService.createTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.forum.topics() });
    },
  });
}
```

## 🎯 TypeScript Type Definitions

### Forum Types
```typescript
// types/forum.types.ts
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  topicCount: number;
  replyCount: number;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    userType: string;
    isVerified: boolean;
  };
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  isPinned: boolean;
  isSolved: boolean;
}

export interface TopicFilters {
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### E-commerce Types
```typescript
// types/ecommerce.types.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  seller: {
    id: string;
    name: string;
    rating: number;
    verified: boolean;
  };
  images: string[];
  stock: number;
  location: string;
  createdAt: string;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productCount: number;
}
```

## 🔄 Error Handling

### API Error Types
```typescript
// types/api.types.ts
export interface APIError {
  success: false;
  error: string;
  details?: any;
  statusCode?: number;
}

export interface APIResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

### Error Handling Hook
```typescript
// hooks/use-error-handler.ts
import { useToast } from '@/hooks/use-toast';

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: any) => {
    const message = error.response?.data?.error || error.message || 'Bir hata oluştu';
    
    toast({
      type: 'error',
      message,
      duration: 5000,
    });
  };

  return { handleError };
}
```

## 🚀 Optimizasyon Stratejileri

### Caching Stratejisi
```typescript
// React Query default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 dakika
      cacheTime: 5 * 60 * 1000, // 5 dakika
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Infinite Queries
```typescript
// hooks/use-infinite-topics.ts
export function useInfiniteTopics(filters?: TopicFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.forum.topics(filters),
    queryFn: ({ pageParam = 1 }) => 
      forumService.getTopics({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  });
}
```

Bu API entegrasyonu dokümantasyonu, mevcut backend API'yi frontend uygulamasına entegre etmek için gerekli tüm yapıları ve stratejileri içermektedir. Her service, type-safe ve performanslı bir şekilde tasarlanmıştır.
