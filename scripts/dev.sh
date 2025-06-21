#!/bin/bash

# GreenAI Forum Platform Development Server Script
# Bu script development server'larını başlatır

set -e

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Environment dosyalarını kontrol et
check_environment() {
    print_info "Environment dosyaları kontrol ediliyor..."
    
    if [ ! -f "web/.env.local" ]; then
        print_error "web/.env.local bulunamadı. Lütfen önce setup script'ini çalıştırın."
        exit 1
    fi
    
    if [ ! -f "api/.env" ]; then
        print_error "api/.env bulunamadı. Lütfen önce setup script'ini çalıştırın."
        exit 1
    fi
    
    print_success "Environment dosyaları mevcut"
}

# Dependencies kontrolü
check_dependencies() {
    print_info "Dependencies kontrol ediliyor..."
    
    if [ ! -d "node_modules" ]; then
        print_warning "Root dependencies bulunamadı. Yükleniyor..."
        npm install
    fi
    
    if [ ! -d "web/node_modules" ]; then
        print_warning "Web dependencies bulunamadı. Yükleniyor..."
        cd web && npm install && cd ..
    fi
    
    if [ ! -d "api/node_modules" ]; then
        print_warning "API dependencies bulunamadı. Yükleniyor..."
        cd api && npm install && cd ..
    fi
    
    print_success "Dependencies hazır"
}

# Port kontrolü
check_ports() {
    print_info "Port kullanımı kontrol ediliyor..."
    
    # Port 3000 kontrolü (Web)
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port 3000 kullanımda. Web uygulaması başka bir portta çalışabilir."
    fi
    
    # Port 3001 kontrolü (API)
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        print_warning "Port 3001 kullanımda. API başka bir portta çalışabilir."
    fi
}

# Veritabanı bağlantısı kontrolü
check_database_connection() {
    print_info "Veritabanı bağlantısı kontrol ediliyor..."
    
    source api/.env
    
    if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_URL" ]; then
        print_error "Veritabanı konfigürasyonu eksik. Lütfen api/.env dosyasını kontrol edin."
        exit 1
    fi
    
    print_success "Veritabanı konfigürasyonu mevcut"
}

# Development server'ları başlat
start_servers() {
    print_info "Development server'ları başlatılıyor..."
    
    echo ""
    echo "🌐 Web: http://localhost:3000"
    echo "🔌 API: http://localhost:3001"
    echo ""
    echo "Çıkmak için Ctrl+C tuşlayın"
    echo ""
    
    # Concurrently ile her iki server'ı da başlat
    npm run dev
}

# Cleanup fonksiyonu
cleanup() {
    print_info "Server'lar kapatılıyor..."
    # Kill all child processes
    pkill -P $$
    print_success "Server'lar kapatıldı"
    exit 0
}

# SIGINT (Ctrl+C) yakalandığında cleanup çalıştır
trap cleanup SIGINT

# Ana fonksiyon
main() {
    echo "🚀 GreenAI Forum Development Server'ları başlatılıyor..."
    
    check_environment
    check_dependencies
    check_ports
    check_database_connection
    
    print_success "Ön kontroller tamamlandı"
    
    start_servers
}

# Script'i çalıştır
main "$@"
