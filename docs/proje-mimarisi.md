# Çiftçi Forum Platformu - Sistem Mimarisi

## 🏗️ Genel Sistem Mimarisi

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile App     │    │   Admin Panel   │
│   (Next.js)     │    │ (React Native)  │    │   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │  (Express.js)   │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  Forum Service  │    │  Media Service  │
│   (Supabase)    │    │   (Node.js)     │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   AI Service    │              │
         │              │ (Gemini API +   │              │
         │              │ Custom Models)  │              │
         │              └─────────────────┘              │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (Supabase)    │
                    └─────────────────┘
```

## 🗄️ Veritabanı Şeması

### Kullanıcı Yönetimi

```sql
-- Kullanıcılar tablosu
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(100),
    expertise_areas TEXT[], -- ['sebze', 'meyve', 'organik']
    user_type VARCHAR(20) DEFAULT 'farmer', -- farmer, expert, moderator, admin
    reputation_score INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kullanıcı rozetleri
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL, -- expert, helpful, active, etc.
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Forum Yapısı

```sql
-- Kategoriler
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Konular
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_solved BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    last_reply_at TIMESTAMP WITH TIME ZONE,
    last_reply_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Yorumlar
CREATE TABLE replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES replies(id), -- for nested replies
    is_solution BOOLEAN DEFAULT false,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Etkileşim Sistemi

```sql
-- Beğeniler
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL, -- topic, reply
    target_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- Takip sistemi
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Konu takibi
CREATE TABLE topic_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);
```

### Medya Yönetimi

```sql
-- Medya dosyaları
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image, video
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medya bağlantıları
CREATE TABLE media_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL, -- topic, reply
    target_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Moderasyon Sistemi

```sql
-- Raporlar
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL, -- topic, reply, user
    target_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderasyon eylemleri
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- delete, hide, warn, ban
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔌 API Tasarımı

### Authentication Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
PUT    /api/auth/profile
```

### Forum Endpoints
```
GET    /api/categories
GET    /api/categories/:id/topics
POST   /api/topics
GET    /api/topics/:id
PUT    /api/topics/:id
DELETE /api/topics/:id
POST   /api/topics/:id/replies
GET    /api/topics/:id/replies
```

### User Endpoints
```
GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/:id/topics
GET    /api/users/:id/replies
POST   /api/users/:id/follow
DELETE /api/users/:id/follow
```

### Media Endpoints
```
POST   /api/media/upload
GET    /api/media/:id
DELETE /api/media/:id
```

## 🔒 Güvenlik Mimarisi

### Authentication & Authorization
- **JWT Token**: Access token (15 min) + Refresh token (7 days)
- **Role-Based Access Control (RBAC)**
- **Row Level Security (RLS)** PostgreSQL'de

### Data Protection
- **Input Validation**: Joi/Zod ile schema validation
- **SQL Injection**: Parameterized queries
- **XSS Protection**: Content sanitization
- **CSRF Protection**: SameSite cookies
- **Rate Limiting**: Redis ile IP-based limiting

### File Upload Security
- **File Type Validation**: Whitelist approach
- **File Size Limits**: Max 10MB images, 100MB videos
- **Virus Scanning**: ClamAV integration
- **CDN Security**: Signed URLs

## 📊 Performans Optimizasyonu

### Database Optimization
```sql
-- İndeksler
CREATE INDEX idx_topics_category_created ON topics(category_id, created_at DESC);
CREATE INDEX idx_replies_topic_created ON replies(topic_id, created_at);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_topics_search ON topics USING gin(to_tsvector('turkish', title || ' ' || content));
```

### Caching Strategy
- **Redis Cache**: Session, user data, popular topics
- **CDN**: Static assets, images, videos
- **Database Query Cache**: Frequently accessed data
- **Application Cache**: Category tree, user permissions

### Real-time Features
- **WebSocket**: Socket.io ile real-time notifications
- **Server-Sent Events**: Live topic updates
- **Push Notifications**: Mobile app için FCM

## 🚀 Deployment Architecture

### Production Environment
```
┌─────────────────┐
│   Cloudflare    │ ← CDN & DDoS Protection
└─────────────────┘
         │
┌─────────────────┐
│     Vercel      │ ← Frontend (Next.js)
└─────────────────┘
         │
┌─────────────────┐
│    Railway      │ ← Backend API
└─────────────────┘
         │
┌─────────────────┐
│    Supabase     │ ← Database & Auth
└─────────────────┘
```

### Monitoring & Logging
- **Application Monitoring**: Sentry
- **Performance Monitoring**: Vercel Analytics
- **Database Monitoring**: Supabase Dashboard
- **Log Aggregation**: Railway Logs

Bu mimari, ölçeklenebilir, güvenli ve performanslı bir forum platformu sağlayacaktır.
