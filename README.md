# 🌱 GreenAI Forum Platformu

Çiftçiler ve bitki yetiştirme uzmanları için kapsamlı forum platformu.

## 📋 Proje Hakkında

GreenAI, tarım sektöründeki bilgi paylaşımını kolaylaştırmak ve çiftçilerin deneyimlerini paylaşabilecekleri modern bir platform oluşturmak amacıyla geliştirilmektedir.

### 🎯 Hedef Kullanıcılar
- Çiftçiler ve üreticiler
- Tarım uzmanları ve mühendisleri
- Hobi bahçıvanları
- Tarım işletmeleri

### ✨ Ana Özellikler
- 📱 Responsive web platformu
- 🔐 Güvenli kullanıcı yönetimi
- 💬 Kategori bazlı forum sistemi
- 📸 Medya paylaşımı (fotoğraf/video)
- 🏆 Rozet ve reputasyon sistemi
- 🔍 Gelişmiş arama ve filtreleme
- 🔔 Real-time bildirimler
- 🛡️ Moderasyon araçları

## 🛠️ Teknoloji Stack

### Frontend
- **Framework**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod

### Backend
- **Runtime**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Socket.io

### DevOps
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry

## 📁 Proje Yapısı

```
GreenAI/
├── docs/                          # Proje dokümantasyonu
│   ├── teknoloji-stack-analizi.md
│   ├── proje-mimarisi.md
│   ├── gereksinim-analizi.md
│   └── gelistirme-roadmap.md
├── web/                           # Next.js web uygulaması
│   ├── src/
│   │   ├── app/                   # App Router
│   │   ├── components/            # React components
│   │   ├── lib/                   # Utility functions
│   │   ├── hooks/                 # Custom hooks
│   │   ├── store/                 # State management
│   │   └── types/                 # TypeScript types
│   ├── public/                    # Static assets
│   └── package.json
├── api/                           # Express.js backend
│   ├── src/
│   │   ├── routes/                # API routes
│   │   ├── middleware/            # Express middleware
│   │   ├── services/              # Business logic
│   │   ├── models/                # Database models
│   │   └── utils/                 # Utility functions
│   └── package.json
├── mobile/                        # React Native app (gelecek)
├── shared/                        # Shared types ve utilities
└── scripts/                       # Build ve deployment scripts
```

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- npm veya yarn
- PostgreSQL (Supabase hesabı)

### Kurulum

1. **Repository'yi klonlayın**
```bash
git clone https://github.com/username/greenai-forum.git
cd greenai-forum
```

2. **Dependencies yükleyin**
```bash
# Web uygulaması
cd web
npm install

# API
cd ../api
npm install
```

3. **Environment variables ayarlayın**
```bash
# web/.env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# api/.env
DATABASE_URL=your_database_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
```

4. **Database migration çalıştırın**
```bash
cd api
npm run migrate
```

5. **Development server'ları başlatın**
```bash
# Terminal 1 - API
cd api
npm run dev

# Terminal 2 - Web
cd web
npm run dev
```

## 📚 Dokümantasyon

- [Teknoloji Stack Analizi](./docs/teknoloji-stack-analizi.md)
- [Proje Mimarisi](./docs/proje-mimarisi.md)
- [Gereksinim Analizi](./docs/gereksinim-analizi.md)
- [Geliştirme Roadmap](./docs/gelistirme-roadmap.md)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add some amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

- **Proje Sahibi**: [Your Name]
- **Email**: your.email@example.com
- **GitHub**: [@yourusername](https://github.com/yourusername)

## 🗺️ Roadmap

- [x] Proje planlama ve dokümantasyon
- [ ] Web platformu MVP
- [ ] Gelişmiş web özellikleri
- [ ] Mobil uygulama
- [ ] Production deployment

---

**Not**: Bu proje aktif geliştirme aşamasındadır. Güncellemeler için repository'yi takip edin.
