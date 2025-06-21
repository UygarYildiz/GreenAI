#!/bin/bash

# GreenAI Forum Platform Setup Script
# Bu script projeyi ilk kez kurmak için gerekli tüm adımları gerçekleştirir

set -e

echo "🌱 GreenAI Forum Platform Kurulum Başlatılıyor..."

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonksiyonlar
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

# Node.js versiyonu kontrolü
check_node_version() {
    print_info "Node.js versiyonu kontrol ediliyor..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js bulunamadı. Lütfen Node.js 18+ yükleyin."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 18+ gerekli. Mevcut versiyon: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js versiyonu uygun: $(node -v)"
}

# npm versiyonu kontrolü
check_npm_version() {
    print_info "npm versiyonu kontrol ediliyor..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm bulunamadı."
        exit 1
    fi
    
    print_success "npm versiyonu: $(npm -v)"
}

# Dependencies yükleme
install_dependencies() {
    print_info "Root dependencies yükleniyor..."
    npm install
    print_success "Root dependencies yüklendi"
    
    print_info "Web dependencies yükleniyor..."
    cd web && npm install && cd ..
    print_success "Web dependencies yüklendi"
    
    print_info "API dependencies yükleniyor..."
    cd api && npm install && cd ..
    print_success "API dependencies yüklendi"
}

# Environment dosyalarını kopyalama
setup_environment() {
    print_info "Environment dosyaları ayarlanıyor..."
    
    if [ ! -f "web/.env.local" ]; then
        cp web/.env.example web/.env.local
        print_warning "web/.env.local oluşturuldu. Lütfen gerekli değerleri doldurun."
    else
        print_info "web/.env.local zaten mevcut."
    fi
    
    if [ ! -f "api/.env" ]; then
        cp api/.env.example api/.env
        print_warning "api/.env oluşturuldu. Lütfen gerekli değerleri doldurun."
    else
        print_info "api/.env zaten mevcut."
    fi
}

# Git hooks kurulumu
setup_git_hooks() {
    print_info "Git hooks kuruluyor..."
    
    if [ -d ".git" ]; then
        npx husky install
        npx husky add .husky/pre-commit "npm run lint"
        npx husky add .husky/commit-msg "npx commitlint --edit \$1"
        print_success "Git hooks kuruldu"
    else
        print_warning "Git repository bulunamadı. Git hooks atlandı."
    fi
}

# Veritabanı kontrolü
check_database() {
    print_info "Veritabanı bağlantısı kontrol ediliyor..."
    
    if [ -f "api/.env" ]; then
        source api/.env
        if [ -z "$DATABASE_URL" ] || [ -z "$SUPABASE_URL" ]; then
            print_warning "Veritabanı bilgileri eksik. Lütfen api/.env dosyasını doldurun."
        else
            print_success "Veritabanı konfigürasyonu mevcut"
        fi
    else
        print_warning "api/.env dosyası bulunamadı"
    fi
}

# Build test
test_build() {
    print_info "Build testi yapılıyor..."
    
    print_info "Web build testi..."
    cd web && npm run build && cd ..
    print_success "Web build başarılı"
    
    print_info "API build testi..."
    cd api && npm run build && cd ..
    print_success "API build başarılı"
}

# Ana kurulum fonksiyonu
main() {
    echo "🚀 Kurulum başlatılıyor..."
    
    check_node_version
    check_npm_version
    install_dependencies
    setup_environment
    setup_git_hooks
    check_database
    
    print_success "Kurulum tamamlandı!"
    
    echo ""
    echo "📋 Sonraki adımlar:"
    echo "1. web/.env.local dosyasındaki Supabase bilgilerini doldurun"
    echo "2. api/.env dosyasındaki veritabanı bilgilerini doldurun"
    echo "3. Veritabanı migration'larını çalıştırın: cd api && npm run migrate"
    echo "4. Development server'ları başlatın: npm run dev"
    echo ""
    echo "📚 Dokümantasyon: ./docs/ klasöründe"
    echo "🐛 Sorun bildirimi: GitHub Issues"
    echo ""
    print_success "GreenAI Forum Platform kuruluma hazır! 🌱"
}

# Script'i çalıştır
main "$@"
