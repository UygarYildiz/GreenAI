# 🔧 GreenAI Forum - Frontend Teknik İmplementasyon Rehberi

## 🚀 Hızlı Başlangıç

### 1. Proje Kurulumu
```bash
# Next.js 14 projesi oluştur
npx create-next-app@latest greenai-forum-web --typescript --tailwind --eslint --app
cd greenai-forum-web

# shadcn/ui kurulumu
npx shadcn-ui@latest init

# Gerekli paketleri yükle
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod framer-motion axios date-fns clsx class-variance-authority
```

### 2. Environment Konfigürasyonu
```bash
# .env.local dosyası oluştur
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="GreenAI Forum"
```

## 🏗️ Temel Mimari Kurulumu

### API Client Konfigürasyonu
```typescript
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Auth token ekleme
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Error handling
apiClient.interceptors.response.use(
  (response) => response,
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

### React Query Provider
```typescript
// providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Zustand Store Örnekleri
```typescript
// stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem('accessToken', token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
```

## 🧩 Komponent Örnekleri

### Forum Kategori Kartı
```typescript
// components/forum/category-card.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    topicCount: number;
    replyCount: number;
  };
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/forum/categories/${category.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900">
                {category.name}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {category.description}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>{category.topicCount} konu</span>
              <span>{category.replyCount} yanıt</span>
            </div>
            <Badge variant="secondary" style={{ backgroundColor: category.color }}>
              Aktif
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Ürün Kartı
```typescript
// components/ecommerce/product-card.tsx
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    seller: {
      name: string;
      rating: number;
      verified: boolean;
    };
    images: string[];
    stock: number;
    location: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square">
        <Image
          src={product.images[0] || '/images/placeholder-product.jpg'}
          alt={product.name}
          fill
          className="object-cover"
        />
        {product.stock < 10 && (
          <Badge className="absolute top-2 right-2 bg-red-500">
            Son {product.stock} adet
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs">
            {product.category}
          </Badge>
          
          <h3 className="font-semibold text-lg line-clamp-2">
            {product.name}
          </h3>
          
          <p className="text-sm text-gray-600 line-clamp-2">
            {product.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-green-600">
              {product.price.toFixed(2)} {product.currency}
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{product.seller.rating}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{product.location}</span>
            {product.seller.verified && (
              <Badge variant="outline" className="text-xs text-green-600">
                Doğrulanmış
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 space-y-2">
        <Button asChild className="w-full">
          <Link href={`/marketplace/products/${product.id}`}>
            Ürünü İncele
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## 🔗 Custom Hooks

### Forum Hook
```typescript
// hooks/use-forum.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumService } from '@/services/forum-service';

export function useCategories() {
  return useQuery({
    queryKey: ['forum', 'categories'],
    queryFn: forumService.getCategories,
  });
}

export function useTopics(categoryId?: string, page = 1) {
  return useQuery({
    queryKey: ['forum', 'topics', categoryId, page],
    queryFn: () => forumService.getTopics({ categoryId, page }),
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: forumService.createTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum', 'topics'] });
    },
  });
}
```

### E-commerce Hook
```typescript
// hooks/use-ecommerce.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { ecommerceService } from '@/services/ecommerce-service';

export function useProducts(filters?: {
  category?: string;
  search?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ['ecommerce', 'products', filters],
    queryFn: () => ecommerceService.getProducts(filters),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['ecommerce', 'product', id],
    queryFn: () => ecommerceService.getProduct(id),
    enabled: !!id,
  });
}
```

## 📱 Responsive Layout Örneği

### Ana Layout
```typescript
// components/layout/main-layout.tsx
import { Header } from './header';
import { Sidebar } from './sidebar';
import { Footer } from './footer';
import { MobileNavigation } from './mobile-navigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r">
          <Sidebar />
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
      
      <Footer />
      
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <MobileNavigation />
      </div>
    </div>
  );
}
```

## 🎨 Tailwind Konfigürasyonu

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
        },
        earth: {
          500: '#92400e',
          600: '#d97706',
        },
        sky: {
          500: '#0ea5e9',
          600: '#38bdf8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
}
```

## 🔒 Form Validation Örneği

```typescript
// components/forms/topic-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const topicSchema = z.object({
  title: z.string().min(5, 'Başlık en az 5 karakter olmalı').max(200),
  content: z.string().min(20, 'İçerik en az 20 karakter olmalı'),
  categoryId: z.string().min(1, 'Kategori seçimi zorunlu'),
});

type TopicFormData = z.infer<typeof topicSchema>;

export default function TopicForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TopicFormData>({
    resolver: zodResolver(topicSchema),
  });

  const onSubmit = async (data: TopicFormData) => {
    // Form submission logic
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Başlık
        </label>
        <input
          {...register('title')}
          className="mt-1 block w-full rounded-md border-gray-300"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>
      
      {/* Diğer form alanları */}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md"
      >
        {isSubmitting ? 'Gönderiliyor...' : 'Konu Oluştur'}
      </button>
    </form>
  );
}
```

Bu teknik rehber, GreenAI Forum frontend geliştirme sürecinde kullanılacak temel yapıları ve implementasyon örneklerini içermektedir. Her komponent ve hook, mevcut backend API'yi destekleyecek şekilde tasarlanmıştır.
