-- ==================== SECURITY TABLES ====================

-- Güvenlik olayları tablosu
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Güvenlik olayları için indeksler
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_activity ON security_events(activity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);

-- Kullanıcı aktiviteleri tablosu
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kullanıcı aktiviteleri için indeksler
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_activity ON user_activities(activity);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX idx_user_activities_resource ON user_activities(resource_type, resource_id);

-- Başarısız giriş denemeleri tablosu
CREATE TABLE failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_count INTEGER DEFAULT 1,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Başarısız giriş denemeleri için indeksler
CREATE INDEX idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_blocked_until ON failed_login_attempts(blocked_until);

-- Token blacklist tablosu
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token blacklist için indeksler
CREATE INDEX idx_token_blacklist_hash ON token_blacklist(token_hash);
CREATE INDEX idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- API anahtarları tablosu
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API anahtarları için indeksler
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Şifrelenmiş veriler tablosu
CREATE TABLE encrypted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data_type VARCHAR(50) NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_iv VARCHAR(32) NOT NULL,
    encryption_tag VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Şifrelenmiş veriler için indeksler
CREATE INDEX idx_encrypted_data_user_id ON encrypted_data(user_id);
CREATE INDEX idx_encrypted_data_type ON encrypted_data(data_type);

-- Güvenlik konfigürasyonu tablosu
CREATE TABLE security_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Güvenlik konfigürasyonu için indeks
CREATE INDEX idx_security_config_key ON security_config(config_key);

-- Audit log tablosu
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log için indeksler
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ==================== SECURITY FUNCTIONS ====================

-- Şifre güçlülük kontrolü fonksiyonu
CREATE OR REPLACE FUNCTION check_password_strength(password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- En az 8 karakter
    IF LENGTH(password) < 8 THEN
        RETURN FALSE;
    END IF;
    
    -- En az bir büyük harf
    IF password !~ '[A-Z]' THEN
        RETURN FALSE;
    END IF;
    
    -- En az bir küçük harf
    IF password !~ '[a-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- En az bir rakam
    IF password !~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    -- En az bir özel karakter
    IF password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger fonksiyonu
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action, table_name, record_id, new_values)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (action, table_name, record_id, old_values, new_values)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action, table_name, record_id, old_values)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ==================== SECURITY TRIGGERS ====================

-- Users tablosu için audit trigger
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Products tablosu için audit trigger
CREATE TRIGGER products_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Orders tablosu için audit trigger
CREATE TRIGGER orders_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==================== SECURITY VIEWS ====================

-- Güvenlik dashboard view
CREATE VIEW security_dashboard AS
SELECT 
    DATE(created_at) as date,
    severity,
    COUNT(*) as event_count
FROM security_events 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), severity
ORDER BY date DESC, severity;

-- Şüpheli aktiviteler view
CREATE VIEW suspicious_activities AS
SELECT 
    se.user_id,
    u.email,
    se.activity,
    se.severity,
    COUNT(*) as occurrence_count,
    MAX(se.created_at) as last_occurrence
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
WHERE se.created_at >= NOW() - INTERVAL '24 hours'
    AND se.severity IN ('high', 'critical')
GROUP BY se.user_id, u.email, se.activity, se.severity
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC, last_occurrence DESC;

-- Başarısız giriş istatistikleri view
CREATE VIEW failed_login_stats AS
SELECT 
    ip_address,
    COUNT(*) as attempt_count,
    MAX(last_attempt) as last_attempt,
    ARRAY_AGG(DISTINCT email) as attempted_emails
FROM failed_login_attempts 
WHERE last_attempt >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) >= 3
ORDER BY attempt_count DESC;

-- ==================== INITIAL SECURITY CONFIG ====================

-- Varsayılan güvenlik konfigürasyonu
INSERT INTO security_config (config_key, config_value, description) VALUES
('password_policy', '{
    "min_length": 8,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_special_chars": true,
    "max_age_days": 90
}', 'Şifre politikası ayarları'),

('rate_limiting', '{
    "general_requests_per_minute": 100,
    "auth_requests_per_minute": 5,
    "api_requests_per_minute": 1000
}', 'Rate limiting ayarları'),

('session_management', '{
    "access_token_expiry_minutes": 15,
    "refresh_token_expiry_days": 7,
    "max_concurrent_sessions": 3
}', 'Oturum yönetimi ayarları'),

('file_upload_security', '{
    "max_file_size_mb": 10,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/gif", "application/pdf"],
    "scan_for_malware": true
}', 'Dosya yükleme güvenlik ayarları');

-- ==================== SECURITY INDEXES FOR PERFORMANCE ====================

-- Composite indexes for common security queries
CREATE INDEX idx_security_events_user_severity_date ON security_events(user_id, severity, created_at);
CREATE INDEX idx_user_activities_user_activity_date ON user_activities(user_id, activity, created_at);
CREATE INDEX idx_audit_logs_table_action_date ON audit_logs(table_name, action, created_at);

-- Partial indexes for active records
CREATE INDEX idx_api_keys_active_user ON api_keys(user_id) WHERE is_active = true;
CREATE INDEX idx_token_blacklist_active ON token_blacklist(token_hash) WHERE expires_at > NOW();

-- ==================== SECURITY CLEANUP PROCEDURES ====================

-- Eski güvenlik olaylarını temizleme prosedürü
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 1 yıldan eski low severity olayları sil
    DELETE FROM security_events 
    WHERE severity = 'low' 
        AND created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 2 yıldan eski medium severity olayları sil
    DELETE FROM security_events 
    WHERE severity = 'medium' 
        AND created_at < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Süresi dolmuş token'ları temizleme prosedürü
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
