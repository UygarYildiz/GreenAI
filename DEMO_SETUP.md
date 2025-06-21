# 🚀 GreenAI Forum - Demo Kurulum Rehberi

Bu rehber, GreenAI Forum uygulamasının demo versiyonunu çalıştırmak için gerekli adımları içerir.

## 📋 Gereksinimler

- **Node.js** (v18 veya üzeri)
- **npm** (v8 veya üzeri)
- **Redis** (opsiyonel - cache için)
- **Git**

## 🛠️ Kurulum Adımları

### 1. Projeyi İndirin
```bash
# Eğer henüz indirmediyseniz
git clone <repository-url>
cd GreenAI
```

### 2. Backend API Kurulumu

```bash
# API dizinine gidin
cd api

# Bağımlılıkları yükleyin
npm install

# TypeScript'i derleyin
npm run build

# Demo sunucuyu başlatın
npm run dev
```

### 3. Frontend Kurulumu (Opsiyonel)

```bash
# Yeni terminal açın ve web dizinine gidin
cd web

# Bağımlılıkları yükleyin
npm install

# Development sunucuyu başlatın
npm run dev
```

## 🔧 Konfigürasyon

### Environment Variables
API klasöründe `.env` dosyası zaten demo değerleri ile oluşturulmuştur. Gerçek kullanım için:

1. `.env.example` dosyasını `.env` olarak kopyalayın
2. Gerçek değerleri girin:
   - Supabase URL ve API anahtarları
   - Redis bağlantı bilgileri
   - JWT secret anahtarları
   - Email SMTP ayarları

### Redis Kurulumu (Opsiyonel)
Cache özelliklerini test etmek için Redis kurabilirsiniz:

**Windows:**
```bash
# Chocolatey ile
choco install redis-64

# Veya Docker ile
docker run -d -p 6379:6379 redis:alpine
```

**macOS:**
```bash
# Homebrew ile
brew install redis
brew services start redis
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

## 🌐 Demo Endpoints

API sunucu çalıştıktan sonra aşağıdaki endpoint'leri test edebilirsiniz:

### 📊 Genel Bilgi
- **API Info**: `GET http://localhost:5000/api`
- **Health Check**: `GET http://localhost:5000/health`

### 🔐 Authentication (Demo)
- **Register**: `POST http://localhost:5000/api/auth/register`
- **Login**: `POST http://localhost:5000/api/auth/login`

### 💬 Forum
- **Categories**: `GET http://localhost:5000/api/forum/categories`
- **Topics**: `GET http://localhost:5000/api/forum/topics`
- **Search**: `GET http://localhost:5000/api/forum/search?q=domates`

### 🛒 E-commerce
- **Products**: `GET http://localhost:5000/api/ecommerce/products`
- **Categories**: `GET http://localhost:5000/api/ecommerce/categories`
- **Stats**: `GET http://localhost:5000/api/ecommerce/stats`

### 🤖 AI Assistant
- **Ask Question**: `POST http://localhost:5000/api/ai/ask` (Auth required)
- **Suggestions**: `GET http://localhost:5000/api/ai/suggestions` (Auth required)
- **Status**: `GET http://localhost:5000/api/ai/status`

### 👑 Membership
- **Plans**: `GET http://localhost:5000/api/membership/plans`
- **Current**: `GET http://localhost:5000/api/membership/current` (Auth required)

## 🧪 Test Etme

### Postman Collection
API endpoint'lerini test etmek için Postman kullanabilirsiniz:

1. Postman'i açın
2. Yeni Collection oluşturun
3. Aşağıdaki örnek request'leri ekleyin:

**Health Check:**
```
GET http://localhost:5000/health
```

**API Info:**
```
GET http://localhost:5000/api
```

**Forum Categories:**
```
GET http://localhost:5000/api/forum/categories
```

**E-commerce Products:**
```
GET http://localhost:5000/api/ecommerce/products
```

### cURL ile Test
```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api

# Forum categories
curl http://localhost:5000/api/forum/categories

# E-commerce products
curl http://localhost:5000/api/ecommerce/products

# AI status
curl http://localhost:5000/api/ai/status
```

## 📱 Frontend Demo

Eğer frontend'i de çalıştırdıysanız:
- **Web App**: `http://localhost:3000`
- **Storybook**: `http://localhost:6006` (eğer kuruluysa)

## 🔍 Özellikler

### ✅ Çalışan Özellikler
- ✅ RESTful API endpoints
- ✅ Authentication system (demo)
- ✅ Forum categories ve topics
- ✅ E-commerce product listing
- ✅ AI assistant endpoints (demo responses)
- ✅ Membership plans
- ✅ Rate limiting
- ✅ Error handling
- ✅ Logging system
- ✅ Security middleware

### 🚧 Demo Limitasyonları
- 🔶 Veritabanı bağlantısı (demo data)
- 🔶 Redis cache (opsiyonel)
- 🔶 Email gönderimi (demo)
- 🔶 AI responses (demo)
- 🔶 Payment processing (demo)
- 🔶 File upload (demo)

## 🐛 Sorun Giderme

### Port Zaten Kullanımda
```bash
# Port 5000 kullanımda ise
lsof -ti:5000 | xargs kill -9

# Veya farklı port kullanın
PORT=5001 npm run dev
```

### Redis Bağlantı Hatası
Redis kurulu değilse cache özellikleri devre dışı kalır, ancak API çalışmaya devam eder.

### TypeScript Derleme Hatası
```bash
# Node modules'ları temizleyin
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📚 Dokümantasyon

- **API Dokümantasyonu**: `http://localhost:5000/api`
- **Swagger/OpenAPI**: Gelecek versiyonda eklenecek
- **Postman Collection**: Gelecek versiyonda eklenecek

## 🎯 Sonraki Adımlar

1. **Veritabanı Kurulumu**: Supabase hesabı oluşturun
2. **Redis Kurulumu**: Cache performansı için
3. **Email Servisi**: SMTP ayarları
4. **AI Entegrasyonu**: Google Gemini API anahtarı
5. **Frontend Geliştirme**: React/Next.js uygulaması

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. `.env` dosyasının doğru olduğundan emin olun
3. Port çakışması olmadığını kontrol edin
4. Node.js ve npm versiyonlarını kontrol edin

---

**🌱 GreenAI Forum - Tarımın Geleceği Burada!**
