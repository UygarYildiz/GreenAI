# 🚀 GreenAI Forum Frontend - Hızlı Başlangıç Rehberi

## 📋 Ön Gereksinimler

- **Node.js** (v18 veya üzeri)
- **npm** (v9 veya üzeri) 
- **Git**
- **Backend API** (http://localhost:5000) çalışır durumda

## 🛠️ Kurulum Adımları

### 1. Proje Oluşturma
```bash
# Next.js 14 projesi oluştur
npx create-next-app@latest greenai-forum-web --typescript --tailwind --eslint --app
cd greenai-forum-web

# Git repository'yi başlat
git init
git add .
git commit -m "Initial commit: Next.js 14 project setup"
```

### 2. shadcn/ui Kurulumu
```bash
# shadcn/ui CLI kurulumu
npx shadcn-ui@latest init

# Temel UI komponenlerini yükle
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
```

### 3. Gerekli Paketleri Yükleme
```bash
# State management ve API
npm install @tanstack/react-query zustand

# Form handling
npm install react-hook-form @hookform/resolvers zod

# HTTP client
npm install axios

# Utilities
npm install date-fns clsx class-variance-authority

# Icons
npm install lucide-react

# Animations
npm install framer-motion

# Development tools
npm install --save-dev @types/node
```

### 4. Environment Konfigürasyonu
```bash
# .env.local dosyası oluştur
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="GreenAI Forum"
EOF
```

### 5. Tailwind Konfigürasyonu
```javascript
// tailwind.config.js - Tarım temalı renkler ekle
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
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a', // Ana yeşil
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
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
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

## 📁 Proje Yapısını Oluşturma

### 1. Klasör Yapısı
```bash
# Ana klasörleri oluştur
mkdir -p src/{components,hooks,lib,services,stores,types,constants}
mkdir -p src/components/{ui,layout,forum,ecommerce,ai,shared}
mkdir -p src/app/{forum,marketplace,ai-assistant,membership,profile}
```

### 2. Temel Dosyaları Oluşturma
```bash
# API client
touch src/lib/api-client.ts
touch src/lib/utils.ts
touch src/lib/query-keys.ts

# Services
touch src/services/{forum,ecommerce,ai,membership}-service.ts

# Stores
touch src/stores/{auth,forum,ecommerce,ui}-store.ts

# Types
touch src/types/{auth,forum,ecommerce,ai,common}.types.ts

# Hooks
touch src/hooks/{use-auth,use-forum,use-ecommerce,use-ai}.ts
```

## 🎨 Temel Konfigürasyonlar

### 1. API Client Kurulumu
```typescript
// src/lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

### 2. React Query Provider
```typescript
// src/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3. Root Layout Güncelleme
```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GreenAI Forum - Çiftçiler için Tarım Platformu',
  description: 'Türk çiftçileri için modern tarım forum ve e-ticaret platformu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

## 🧪 İlk Testler

### 1. Backend Bağlantısını Test Et
```typescript
// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<string>('Kontrol ediliyor...');

  useEffect(() => {
    const checkAPI = async () => {
      try {
        const response = await apiClient.get('/');
        setApiStatus('✅ Backend API bağlantısı başarılı!');
      } catch (error) {
        setApiStatus('❌ Backend API bağlantısı başarısız!');
      }
    };

    checkAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          🌱 GreenAI Forum
        </h1>
        <p className="text-gray-600 mb-4">
          Frontend geliştirme başladı!
        </p>
        <div className="p-3 bg-gray-100 rounded">
          <p className="text-sm">{apiStatus}</p>
        </div>
      </div>
    </div>
  );
}
```

### 2. Development Server'ı Başlat
```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın ve backend bağlantısını kontrol edin.

## 📚 Geliştirme Süreci

### Faz 1: Temel Altyapı ✅
- [x] Next.js 14 kurulumu
- [x] Tailwind CSS + shadcn/ui
- [x] API client konfigürasyonu
- [x] Proje yapısı oluşturma

### Faz 2: Forum Modülü (Sonraki)
- [ ] Forum ana sayfası
- [ ] Kategori listesi
- [ ] Konu listesi ve detayları
- [ ] Arama fonksiyonalitesi

### Faz 3: E-ticaret Modülü
- [ ] Ürün listesi
- [ ] Ürün detayları
- [ ] Alışveriş sepeti
- [ ] Satıcı paneli

## 🔧 Geliştirme Araçları

### Faydalı Komutlar
```bash
# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# shadcn/ui komponent ekleme
npx shadcn-ui@latest add [component-name]
```

### VS Code Eklentileri (Önerilen)
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript Importer
- Auto Rename Tag
- Prettier - Code formatter

## 📖 Dokümantasyon

- **Genel Plan**: `docs/frontend-gelistirme-plani.md`
- **Teknik Rehber**: `docs/frontend-teknik-rehber.md`
- **Komponent Kütüphanesi**: `docs/frontend-komponent-kutuphanesi.md`
- **API Entegrasyonu**: `docs/frontend-api-entegrasyonu.md`

## 🎯 Sonraki Adımlar

1. **Backend API'yi test edin** - `http://localhost:5000/api` çalışır durumda olmalı
2. **İlk komponenti oluşturun** - Forum kategorileri listesi ile başlayın
3. **API entegrasyonunu test edin** - Forum kategorilerini çekin ve gösterin
4. **Layout'u geliştirin** - Header, sidebar ve footer ekleyin

---

Bu rehber ile GreenAI Forum frontend geliştirme sürecini başlatabilirsiniz. Her adım detaylı olarak dokümante edilmiş ve task management sisteminde takip edilmektedir.

**🌱 İyi geliştirmeler!**
