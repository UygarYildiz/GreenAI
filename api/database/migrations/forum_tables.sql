-- ==================== FORUM CORE TABLES ====================

-- Kategoriler tablosu
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    topic_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    last_topic_id UUID,
    last_topic_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kategoriler için indeksler
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Konular tablosu
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT, -- İlk 200 karakter
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Topic durumu
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_solved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    
    -- İstatistikler
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    
    -- Son aktivite
    last_reply_at TIMESTAMP WITH TIME ZONE,
    last_reply_by UUID REFERENCES users(id),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- SEO ve metadata
    meta_title VARCHAR(255),
    meta_description TEXT,
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Konular için indeksler
CREATE INDEX idx_topics_author_id ON topics(author_id);
CREATE INDEX idx_topics_category_id ON topics(category_id);
CREATE INDEX idx_topics_slug ON topics(slug);
CREATE INDEX idx_topics_is_pinned ON topics(is_pinned);
CREATE INDEX idx_topics_is_solved ON topics(is_solved);
CREATE INDEX idx_topics_is_featured ON topics(is_featured);
CREATE INDEX idx_topics_last_activity ON topics(last_activity_at DESC);
CREATE INDEX idx_topics_created_at ON topics(created_at DESC);
CREATE INDEX idx_topics_category_activity ON topics(category_id, last_activity_at DESC);
CREATE INDEX idx_topics_search ON topics USING gin(to_tsvector('turkish', title || ' ' || content));
CREATE INDEX idx_topics_tags ON topics USING gin(tags);

-- Yorumlar tablosu
CREATE TABLE replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES replies(id) ON DELETE CASCADE, -- nested replies
    
    -- Reply durumu
    is_solution BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    is_edited BOOLEAN DEFAULT false,
    
    -- İstatistikler
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0, -- nested reply sayısı
    
    -- Metadata
    edit_reason TEXT,
    edited_at TIMESTAMP WITH TIME ZONE,
    edited_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Yorumlar için indeksler
CREATE INDEX idx_replies_author_id ON replies(author_id);
CREATE INDEX idx_replies_topic_id ON replies(topic_id);
CREATE INDEX idx_replies_parent_id ON replies(parent_id);
CREATE INDEX idx_replies_is_solution ON replies(is_solution);
CREATE INDEX idx_replies_created_at ON replies(created_at);
CREATE INDEX idx_replies_topic_created ON replies(topic_id, created_at);

-- Beğeniler tablosu
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('topic', 'reply')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- Beğeniler için indeksler
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_likes_created_at ON likes(created_at);

-- Yer imleri tablosu
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Yer imleri için indeksler
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_topic_id ON bookmarks(topic_id);

-- Konu takibi tablosu
CREATE TABLE topic_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) DEFAULT 'all' CHECK (notification_type IN ('all', 'replies', 'solutions')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Konu takibi için indeksler
CREATE INDEX idx_topic_subscriptions_user_id ON topic_subscriptions(user_id);
CREATE INDEX idx_topic_subscriptions_topic_id ON topic_subscriptions(topic_id);
CREATE INDEX idx_topic_subscriptions_active ON topic_subscriptions(is_active);

-- Medya dosyaları tablosu
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'video', 'document')),
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    alt_text TEXT,
    
    -- İlişkiler
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- video için saniye
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medya dosyaları için indeksler
CREATE INDEX idx_media_files_uploaded_by ON media_files(uploaded_by);
CREATE INDEX idx_media_files_topic_id ON media_files(topic_id);
CREATE INDEX idx_media_files_reply_id ON media_files(reply_id);
CREATE INDEX idx_media_files_file_type ON media_files(file_type);

-- Kullanıcı rozetleri tablosu
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    color VARCHAR(7),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    awarded_by UUID REFERENCES users(id), -- manuel verilen rozetler için
    metadata JSONB DEFAULT '{}'
);

-- Kullanıcı rozetleri için indeksler
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_type ON user_badges(badge_type);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at);

-- ==================== FORUM FUNCTIONS ====================

-- Slug oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
BEGIN
    -- Türkçe karakterleri değiştir ve slug oluştur
    slug := lower(input_text);
    slug := replace(slug, 'ç', 'c');
    slug := replace(slug, 'ğ', 'g');
    slug := replace(slug, 'ı', 'i');
    slug := replace(slug, 'ö', 'o');
    slug := replace(slug, 'ş', 's');
    slug := replace(slug, 'ü', 'u');
    slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
    slug := regexp_replace(slug, '\s+', '-', 'g');
    slug := trim(both '-' from slug);
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Topic istatistiklerini güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_topic_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Yeni reply eklendiğinde
        UPDATE topics SET 
            reply_count = reply_count + 1,
            last_reply_at = NEW.created_at,
            last_reply_by = NEW.author_id,
            last_activity_at = NEW.created_at
        WHERE id = NEW.topic_id;
        
        -- Kategori istatistiklerini güncelle
        UPDATE categories SET 
            reply_count = reply_count + 1
        WHERE id = (SELECT category_id FROM topics WHERE id = NEW.topic_id);
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reply silindiğinde
        UPDATE topics SET 
            reply_count = reply_count - 1
        WHERE id = OLD.topic_id;
        
        -- Kategori istatistiklerini güncelle
        UPDATE categories SET 
            reply_count = reply_count - 1
        WHERE id = (SELECT category_id FROM topics WHERE id = OLD.topic_id);
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Kategori istatistiklerini güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_category_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Yeni topic eklendiğinde
        UPDATE categories SET 
            topic_count = topic_count + 1,
            last_topic_id = NEW.id,
            last_topic_at = NEW.created_at
        WHERE id = NEW.category_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Topic silindiğinde
        UPDATE categories SET 
            topic_count = topic_count - 1
        WHERE id = OLD.category_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Like sayısını güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Like eklendiğinde
        IF NEW.target_type = 'topic' THEN
            UPDATE topics SET like_count = like_count + 1 WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'reply' THEN
            UPDATE replies SET like_count = like_count + 1 WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Like silindiğinde
        IF OLD.target_type = 'topic' THEN
            UPDATE topics SET like_count = like_count - 1 WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'reply' THEN
            UPDATE replies SET like_count = like_count - 1 WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ==================== TRIGGERS ====================

-- Topic istatistikleri trigger
CREATE TRIGGER trigger_update_topic_stats
    AFTER INSERT OR DELETE ON replies
    FOR EACH ROW EXECUTE FUNCTION update_topic_stats();

-- Kategori istatistikleri trigger
CREATE TRIGGER trigger_update_category_stats
    AFTER INSERT OR DELETE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_category_stats();

-- Like sayısı trigger
CREATE TRIGGER trigger_update_like_count
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- Updated_at otomatik güncelleme
CREATE TRIGGER trigger_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_replies_updated_at
    BEFORE UPDATE ON replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== INITIAL DATA ====================

-- Varsayılan kategoriler
INSERT INTO categories (name, slug, description, icon, color, sort_order) VALUES
('Genel Tartışma', 'genel-tartisma', 'Genel tarım konuları ve sohbet', '💬', '#3B82F6', 1),
('Sebze Yetiştiriciliği', 'sebze-yetistiriciligi', 'Sebze ekimi, bakımı ve hasadı', '🥕', '#10B981', 2),
('Meyve Yetiştiriciliği', 'meyve-yetistiriciligi', 'Meyve ağaçları ve bakımı', '🍎', '#F59E0B', 3),
('Organik Tarım', 'organik-tarim', 'Organik üretim yöntemleri', '🌿', '#059669', 4),
('Hastalık ve Zararlılar', 'hastalik-ve-zararlilar', 'Bitki hastalıkları ve mücadele yöntemleri', '🐛', '#DC2626', 5),
('Toprak ve Gübre', 'toprak-ve-gubre', 'Toprak analizi ve gübreleme', '🌱', '#92400E', 6),
('Sulama Sistemleri', 'sulama-sistemleri', 'Sulama teknikleri ve sistemleri', '💧', '#0EA5E9', 7),
('Tarım Makineleri', 'tarim-makineleri', 'Tarım ekipmanları ve makineleri', '🚜', '#6B7280', 8),
('Sera ve Örtü Altı', 'sera-ve-ortu-alti', 'Sera yetiştiriciliği', '🏠', '#8B5CF6', 9),
('Pazarlama ve Satış', 'pazarlama-ve-satis', 'Ürün pazarlama ve satış stratejileri', '💰', '#059669', 10);

-- Rozet tipleri için örnek veriler
INSERT INTO user_badges (user_id, badge_type, badge_name, description, icon_url, color) 
SELECT 
    u.id,
    'welcome',
    'Hoş Geldin',
    'Platforma katıldığın için teşekkürler!',
    '/badges/welcome.svg',
    '#3B82F6'
FROM users u 
WHERE u.created_at >= NOW() - INTERVAL '1 day'
LIMIT 5;
