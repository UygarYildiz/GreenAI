# 🌱 GreenAI Forum - Frontend Geliştirme Planı

## 📋 Proje Genel Bakış

Bu dokümantasyon, GreenAI Forum projesi için kapsamlı frontend geliştirme planını içermektedir. Plan, mevcut backend API'yi (http://localhost:5000) baz alarak modern React/Next.js tabanlı bir web uygulaması geliştirilmesini hedeflemektedir.

### 🎯 Proje Hedefleri

- **Kullanıcı Odaklı**: Türk çiftçileri için özel olarak tasarlanmış kullanıcı dostu arayüz
- **Modern Teknoloji**: Next.js 14, TypeScript, Tailwind CSS ile güncel teknoloji stack
- **Responsive Design**: Mobil-first yaklaşım ile tüm cihazlarda mükemmel deneyim
- **Performance**: Hızlı yükleme süreleri ve optimize edilmiş kullanıcı deneyimi
- **Accessibility**: WCAG standartlarına uygun erişilebilir tasarım

### 🏗️ Teknik Mimari

```
Frontend Stack:
├── Next.js 14 (App Router)     # React framework
├── TypeScript                  # Type safety
├── Tailwind CSS + shadcn/ui   # Styling framework
├── React Query (TanStack)      # Server state management
├── Zustand                     # Client state management
├── React Hook Form + Zod       # Form handling & validation
├── Framer Motion              # Animations
└── PWA Support                # Progressive Web App
```

### 📊 Backend API Entegrasyonu

Mevcut backend API endpoint'leri:
- **Forum**: `/api/forum/*` - Kategoriler, konular, yorumlar
- **E-ticaret**: `/api/ecommerce/*` - Ürünler, kategoriler, siparişler
- **AI Asistan**: `/api/ai/*` - Soru-cevap, öneriler
- **Üyelik**: `/api/membership/*` - Planlar, yükseltme
- **Auth**: `/api/auth/*` - Giriş, kayıt, token yönetimi

## 🗂️ Proje Dosya Yapısı

```
greenai-forum-web/
├── public/                     # Statik dosyalar
│   ├── icons/                 # PWA ikonları
│   ├── images/                # Resim dosyaları
│   └── manifest.json          # PWA manifest
├── src/
│   ├── app/                   # Next.js 14 App Router
│   │   ├── (auth)/           # Auth route group
│   │   ├── forum/            # Forum sayfaları
│   │   ├── marketplace/      # E-ticaret sayfaları
│   │   ├── ai-assistant/     # AI asistan
│   │   ├── membership/       # Üyelik sayfaları
│   │   ├── profile/          # Profil sayfaları
│   │   └── globals.css       # Global CSS
│   ├── components/           # React komponenleri
│   │   ├── ui/              # shadcn/ui komponenleri
│   │   ├── layout/          # Layout komponenleri
│   │   ├── forum/           # Forum komponenleri
│   │   ├── ecommerce/       # E-ticaret komponenleri
│   │   ├── ai/              # AI komponenleri
│   │   └── shared/          # Ortak komponenler
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utility fonksiyonları
│   ├── services/            # API service layer
│   ├── stores/              # Zustand stores
│   ├── types/               # TypeScript types
│   └── constants/           # Sabitler
├── .env.local               # Environment variables
├── next.config.js           # Next.js konfigürasyonu
├── tailwind.config.js       # Tailwind konfigürasyonu
├── tsconfig.json            # TypeScript konfigürasyonu
└── package.json             # Dependencies
```

## 🎨 Tasarım Sistemi

### Renk Paleti (Tarım Temalı)
```css
:root {
  /* Primary Colors - Doğa Temalı */
  --green-primary: #16a34a;      /* Ana yeşil */
  --green-secondary: #22c55e;    /* Açık yeşil */
  --green-dark: #15803d;         /* Koyu yeşil */
  
  /* Earth Tones - Toprak Tonları */
  --brown-primary: #92400e;      /* Toprak kahvesi */
  --brown-light: #d97706;        /* Açık kahve */
  
  /* Sky Colors - Gökyüzü */
  --blue-primary: #0ea5e9;       /* Gökyüzü mavisi */
  --blue-light: #38bdf8;         /* Açık mavi */
}
```

### Typography
- **Font Family**: Inter (modern, okunabilir)
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold)
- **Size Scale**: 12px - 30px arası responsive ölçek

### Komponent Varyantları
- **Button**: primary, secondary, success, warning, danger
- **Card**: default, elevated, bordered
- **Input**: default, search, textarea

## 📱 Responsive Design

### Breakpoint Sistemi
```css
/* Mobile First Approach */
xs: 0px - 475px     /* Küçük telefonlar */
sm: 476px - 640px   /* Büyük telefonlar */
md: 641px - 768px   /* Tabletler */
lg: 769px - 1024px  /* Küçük laptoplar */
xl: 1025px - 1280px /* Büyük laptoplar */
2xl: 1281px+        /* Desktop */
```

### Mobil Optimizasyonları
- **Touch-friendly**: Minimum 44px buton boyutu
- **Swipe gestures**: Kart navigasyonu
- **Pull-to-refresh**: Liste yenileme
- **Infinite scroll**: Performans optimizasyonu
- **Offline support**: PWA özellikleri

## 🔧 Geliştirme Araçları

### Kurulum Komutları
```bash
# Proje oluşturma
npx create-next-app@latest greenai-forum-web --typescript --tailwind --eslint --app

# shadcn/ui kurulumu
npx shadcn-ui@latest init

# Gerekli paketler
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod framer-motion
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

## 🧪 Testing Stratejisi

### Test Türleri
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: API entegrasyonu testleri
- **E2E Tests**: Playwright ile user flow testleri
- **Visual Tests**: Storybook ile komponent testleri

### Test Konfigürasyonu
```bash
# Test paketleri
npm install --save-dev jest @testing-library/react @testing-library/jest-dom playwright
```

## 🚀 Deployment Stratejisi

### Production Deployment
- **Platform**: Vercel (önerilen) veya Netlify
- **CI/CD**: GitHub Actions ile otomatik deployment
- **Environment**: Production, Staging, Development

### Performance Optimizasyonu
- **Code Splitting**: Route-based ve component-based
- **Image Optimization**: Next.js Image component
- **Caching**: API responses ve static assets
- **Bundle Analysis**: webpack-bundle-analyzer

## 📈 Monitoring ve Analytics

### Monitoring Araçları
- **Error Tracking**: Sentry
- **Performance**: Vercel Analytics
- **User Analytics**: Google Analytics 4
- **Real User Monitoring**: Web Vitals

## 🔒 Güvenlik

### Frontend Güvenlik Önlemleri
- **XSS Protection**: Content Security Policy
- **CSRF Protection**: SameSite cookies
- **Input Validation**: Zod schemas
- **Secure Headers**: Next.js security headers

## 📚 Dokümantasyon

### Geliştirici Dokümantasyonu
- **Component Library**: Storybook
- **API Documentation**: TypeScript interfaces
- **Style Guide**: Tailwind CSS utilities
- **Best Practices**: Coding standards

## 🎯 Başarı Metrikleri

### Performance KPI'ları
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### User Experience KPI'ları
- **Mobile Usability**: 95%+
- **Accessibility Score**: 90%+
- **SEO Score**: 90%+
- **PWA Score**: 85%+

---

Bu dokümantasyon, GreenAI Forum frontend geliştirme sürecinin tüm aşamalarını kapsamaktadır. Her faz için detaylı task listesi ve implementasyon rehberi task management sisteminde takip edilmektedir.
