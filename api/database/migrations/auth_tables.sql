-- ==================== AUTHENTICATION TABLES ====================

-- Kullanıcılar tablosu (güncellenmiş)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(100),
    expertise_areas TEXT[] DEFAULT '{}',
    user_type VARCHAR(20) DEFAULT 'farmer' CHECK (user_type IN ('farmer', 'expert', 'moderator', 'admin')),
    reputation_score INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(64),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    password_reset_token VARCHAR(64),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kullanıcılar tablosu için indeksler
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Refresh token'lar tablosu
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh tokens için indeksler
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_is_active ON refresh_tokens(is_active);

-- Kullanıcı oturumları tablosu
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    location_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions için indeksler
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Kullanıcı rolleri tablosu
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kullanıcı-rol ilişkisi tablosu
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- User role assignments için indeksler
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_is_active ON user_role_assignments(is_active);

-- Kullanıcı profil ayarları tablosu
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    language VARCHAR(10) DEFAULT 'tr',
    timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',
    email_notifications JSONB DEFAULT '{
        "forum_replies": true,
        "direct_messages": true,
        "newsletter": true,
        "marketing": false,
        "security_alerts": true
    }',
    privacy_settings JSONB DEFAULT '{
        "profile_visibility": "public",
        "show_email": false,
        "show_location": true,
        "allow_direct_messages": true
    }',
    theme_preferences JSONB DEFAULT '{
        "theme": "light",
        "compact_mode": false,
        "show_avatars": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences için indeks
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Kullanıcı sosyal profilleri tablosu
CREATE TABLE user_social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    profile_url TEXT NOT NULL,
    username VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- User social profiles için indeksler
CREATE INDEX idx_user_social_profiles_user_id ON user_social_profiles(user_id);
CREATE INDEX idx_user_social_profiles_platform ON user_social_profiles(platform);

-- ==================== AUTHENTICATION FUNCTIONS ====================

-- Kullanıcı oluşturma trigger fonksiyonu
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Kullanıcı oluşturulduğunda otomatik preferences oluştur
CREATE TRIGGER trigger_create_user_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_preferences();

-- Updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users tablosu için updated_at trigger
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User preferences için updated_at trigger
CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Şifre güçlülük kontrolü fonksiyonu
CREATE OR REPLACE FUNCTION validate_password_strength(password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Bu fonksiyon backend'de kontrol edildiği için burada sadece placeholder
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Email format kontrolü fonksiyonu
CREATE OR REPLACE FUNCTION validate_email_format(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Username format kontrolü fonksiyonu
CREATE OR REPLACE FUNCTION validate_username_format(username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- 3-30 karakter, sadece harf, rakam ve underscore
    RETURN username ~ '^[a-zA-Z0-9_]{3,30}$';
END;
$$ LANGUAGE plpgsql;

-- ==================== AUTHENTICATION VIEWS ====================

-- Aktif kullanıcılar view
CREATE VIEW active_users AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.user_type,
    u.reputation_score,
    u.is_verified,
    u.email_verified,
    u.last_login_at,
    u.created_at,
    up.language,
    up.timezone
FROM users u
LEFT JOIN user_preferences up ON u.id = up.user_id
WHERE u.is_active = true AND u.email_verified = true;

-- Kullanıcı istatistikleri view
CREATE VIEW user_statistics AS
SELECT 
    user_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_verified THEN 1 END) as verified_users,
    COUNT(CASE WHEN email_verified THEN 1 END) as email_verified_users,
    COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
    AVG(reputation_score) as avg_reputation
FROM users 
WHERE is_active = true
GROUP BY user_type;

-- Son giriş istatistikleri view
CREATE VIEW login_statistics AS
SELECT 
    DATE(last_login_at) as login_date,
    COUNT(*) as login_count,
    COUNT(DISTINCT user_id) as unique_users
FROM user_sessions 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(last_login_at)
ORDER BY login_date DESC;

-- ==================== INITIAL DATA ====================

-- Varsayılan roller
INSERT INTO user_roles (name, description, permissions) VALUES
('admin', 'System Administrator', '{
    "users": ["create", "read", "update", "delete"],
    "forum": ["create", "read", "update", "delete", "moderate"],
    "ecommerce": ["create", "read", "update", "delete", "manage"],
    "ai": ["create", "read", "update", "delete", "configure"],
    "system": ["configure", "monitor", "backup"]
}'),
('moderator', 'Forum Moderator', '{
    "users": ["read", "update"],
    "forum": ["create", "read", "update", "delete", "moderate"],
    "ecommerce": ["read"],
    "ai": ["read"]
}'),
('expert', 'Agricultural Expert', '{
    "users": ["read", "update_own"],
    "forum": ["create", "read", "update_own", "expert_answer"],
    "ecommerce": ["create", "read", "update_own"],
    "ai": ["read", "contribute"]
}'),
('seller', 'Marketplace Seller', '{
    "users": ["read", "update_own"],
    "forum": ["create", "read", "update_own"],
    "ecommerce": ["create", "read", "update_own", "sell"],
    "ai": ["read"]
}'),
('user', 'Regular User', '{
    "users": ["read", "update_own"],
    "forum": ["create", "read", "update_own"],
    "ecommerce": ["read", "buy"],
    "ai": ["read"]
}');

-- ==================== CLEANUP PROCEDURES ====================

-- Süresi dolmuş token'ları temizleme
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Süresi dolmuş refresh token'ları sil
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Süresi dolmuş session'ları sil
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Süresi dolmuş email verification token'ları temizle
    UPDATE users 
    SET email_verification_token = NULL, 
        email_verification_expires = NULL 
    WHERE email_verification_expires < NOW();
    
    -- Süresi dolmuş password reset token'ları temizle
    UPDATE users 
    SET password_reset_token = NULL, 
        password_reset_expires = NULL 
    WHERE password_reset_expires < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Günlük temizlik job'ı için scheduled function
CREATE OR REPLACE FUNCTION daily_auth_cleanup()
RETURNS void AS $$
BEGIN
    PERFORM cleanup_expired_tokens();
    
    -- 90 günden eski inactive session'ları sil
    DELETE FROM user_sessions 
    WHERE is_active = false 
        AND last_activity < NOW() - INTERVAL '90 days';
    
    -- 1 yıldan eski failed login attempt'leri sil
    DELETE FROM failed_login_attempts 
    WHERE last_attempt < NOW() - INTERVAL '1 year';
    
    RAISE NOTICE 'Daily authentication cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- ==================== SECURITY CONSTRAINTS ====================

-- Email format constraint
ALTER TABLE users ADD CONSTRAINT check_email_format 
    CHECK (validate_email_format(email));

-- Username format constraint
ALTER TABLE users ADD CONSTRAINT check_username_format 
    CHECK (validate_username_format(username));

-- Reputation score constraint
ALTER TABLE users ADD CONSTRAINT check_reputation_score 
    CHECK (reputation_score >= 0);

-- Token expiry constraint
ALTER TABLE refresh_tokens ADD CONSTRAINT check_token_expiry 
    CHECK (expires_at > created_at);

-- Session expiry constraint
ALTER TABLE user_sessions ADD CONSTRAINT check_session_expiry 
    CHECK (expires_at > created_at);
