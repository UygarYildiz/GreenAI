# Çiftçi Forum Platformu - Gereksinim Analizi

## 👥 Hedef Kullanıcı Grupları

### 1. Çiftçiler (Birincil Kullanıcılar)
- **Profil**: Küçük/orta ölçekli çiftçiler, hobi bahçıvanları
- **İhtiyaçlar**: Pratik çözümler, deneyim paylaşımı, sorun çözme
- **Teknoloji Seviyesi**: Temel-orta seviye

### 2. Tarım Uzmanları
- **Profil**: Ziraat mühendisleri, araştırmacılar, danışmanlar
- **İhtiyaçlar**: Bilgi paylaşımı, profesyonel network, güncel araştırmalar
- **Teknoloji Seviyesi**: İleri seviye

### 3. Tarım İşletmeleri
- **Profil**: Tohum/gübre firmaları, ekipman satıcıları
- **İhtiyaçlar**: Ürün tanıtımı, müşteri desteği, pazar araştırması
- **Teknoloji Seviyesi**: İleri seviye

## 🎯 Kullanıcı Hikayeleri

### Çiftçi Hikayeleri
```
Hikaye 1: Hastalık Teşhisi
Kullanıcı: Ahmet (domates üreticisi)
İhtiyaç: "Domateslerimde sarı lekeler var, ne yapmalıyım?"
Akış: Fotoğraf yükle → Kategori seç → Konu aç → Uzman cevabı al
```

```
Hikaye 2: Deneyim Paylaşımı
Kullanıcı: Fatma (organik üretici)
İhtiyaç: "Organik gübre deneyimimi paylaşmak istiyorum"
Akış: Konu aç → Detaylı açıklama yaz → Fotoğraflar ekle → Toplulukla paylaş
```

### Uzman Hikayeleri
```
Hikaye 3: Profesyonel Destek
Kullanıcı: Dr. Mehmet (Ziraat Mühendisi)
İhtiyaç: "Çiftçilere güncel bilgiler vermek istiyorum"
Akış: Uzman profili oluştur → Makale yaz → Soruları cevapla → Rozet kazan
```

## 📋 Detaylı Özellik Listesi

### 🤖 AI Entegrasyonu (YENİ)
**Aşama 1 - Gemini API Entegrasyonu:**
- [x] Google Gemini 2.0 Flash API entegrasyonu
- [x] Forum sorularına otomatik AI cevapları
- [x] Kategori bazlı AI aktivasyonu
- [x] AI cevaplarının ayrı gösterimi
- [x] Güven skoru ve kalite kontrolü
- [x] Kullanıcı feedback sistemi
- [x] Rate limiting ve maliyet kontrolü
- [x] Content filtering ve moderasyon

**Aşama 2 - Özelleştirilmiş AI Modeli:**
- [ ] Türkiye'ye özel tarım AI modeli
- [ ] Fine-tuning ve RAG sistemi
- [ ] Multimodal görsel analiz
- [ ] Sürekli öğrenme pipeline
- [ ] Yerel iklim ve toprak entegrasyonu

### 🔐 Kullanıcı Yönetimi
**Temel Özellikler:**
- [x] Email/telefon ile kayıt
- [x] Sosyal medya ile giriş (Google, Facebook)
- [x] Profil oluşturma ve düzenleme
- [x] Avatar yükleme
- [x] Biyografi ve uzmanlık alanları
- [x] Konum bilgisi
- [x] Gizlilik ayarları

**Gelişmiş Özellikler:**
- [x] İki faktörlü doğrulama (2FA)
- [x] Email doğrulama
- [x] Şifre sıfırlama
- [x] Hesap silme/deaktive etme
- [x] Kullanıcı engelleme

### 🏷️ Rozet ve Reputasyon Sistemi
**Rozet Türleri:**
- 🌟 **Yeni Üye**: İlk kayıt
- 🌱 **Aktif Üye**: 10+ gönderi
- 🏆 **Uzman**: Doğrulanmış uzman
- 💡 **Yardımsever**: 50+ yararlı cevap
- 📸 **Fotoğrafçı**: 20+ fotoğraf paylaşımı
- 🔥 **Popüler**: 100+ beğeni
- 👑 **Efsane**: 1000+ reputasyon

**Reputasyon Puanları:**
- Konu açma: +2 puan
- Yorum yapma: +1 puan
- Beğeni alma: +5 puan
- En iyi cevap seçilme: +15 puan
- Uzman doğrulaması: +100 puan

### 📂 Forum Kategorileri
**Ana Kategoriler:**
1. **🍅 Sebze Yetiştirme**
   - Domates, biber, patlıcan
   - Yapraklı sebzeler
   - Kök sebzeler

2. **🍎 Meyve Yetiştirme**
   - Bahçe meyveleri
   - Tropik meyveler
   - Bağcılık

3. **🌾 Tahıl ve Baklagiller**
   - Buğday, arpa, mısır
   - Nohut, mercimek, fasulye

4. **🌿 Organik Tarım**
   - Organik gübreler
   - Doğal pestisitler
   - Sertifikasyon

5. **🐛 Hastalık ve Zararlılar**
   - Bitki hastalıkları
   - Zararlı böcekler
   - Tedavi yöntemleri

6. **🚜 Ekipman ve Teknoloji**
   - Tarım makineleri
   - Sulama sistemleri
   - Akıllı tarım

### 💬 Forum Özellikleri
**Konu Yönetimi:**
- [x] Konu açma/düzenleme/silme
- [x] Kategori seçimi
- [x] Etiket sistemi
- [x] Fotoğraf/video ekleme
- [x] Konu sabitleme (moderatör)
- [x] Konu kilitleme
- [x] Çözüm işaretleme
- [x] AI cevabı talep etme
- [x] AI cevabı güven skoru gösterimi

**Yorum Sistemi:**
- [x] Yorum yapma/düzenleme/silme
- [x] Nested yorumlar (3 seviye)
- [x] Yorum beğenme
- [x] En iyi cevap seçimi
- [x] Mention sistemi (@kullanıcı)
- [x] Emoji reaksiyonları
- [x] AI cevaplarına özel feedback sistemi

### 🔍 Arama ve Filtreleme
**Arama Özellikleri:**
- [x] Genel arama (başlık + içerik)
- [x] Kategori bazlı arama
- [x] Kullanıcı bazlı arama
- [x] Etiket arama
- [x] Gelişmiş filtreler
- [x] Arama geçmişi
- [x] Popüler aramalar

**Filtreleme Seçenekleri:**
- Tarih aralığı
- Kategori
- Çözülmüş/çözülmemiş
- Medya içeren
- Uzman cevaplı

### 📱 Bildirim Sistemi
**Bildirim Türleri:**
- [x] Yeni yorum bildirimi
- [x] Mention bildirimi
- [x] Beğeni bildirimi
- [x] Takip edilen konularda güncelleme
- [x] Yeni takipçi bildirimi
- [x] Rozet kazanma bildirimi

**Bildirim Kanalları:**
- [x] In-app bildirimler
- [x] Email bildirimleri
- [x] Push notifications (mobil)
- [x] SMS bildirimleri (opsiyonel)

### 🛡️ Moderasyon Araçları
**Kullanıcı Moderasyonu:**
- [x] İçerik raporlama
- [x] Kullanıcı engelleme
- [x] Spam filtreleme
- [x] Otomatik moderasyon (AI)
- [x] Moderatör paneli

**İçerik Moderasyonu:**
- [x] Konu/yorum silme
- [x] İçerik gizleme
- [x] Kullanıcı uyarısı
- [x] Geçici/kalıcı ban
- [x] IP engelleme

## 🔄 İş Akışları

### Yeni Kullanıcı Onboarding
```
1. Kayıt ol → Email doğrula
2. Profil tamamla → Uzmanlık alanları seç
3. İlk konu aç VEYA yorum yap
4. "Yeni Üye" rozetini kazan
5. Topluluk kurallarını öğren
```

### Konu Açma Süreci
```
1. "Yeni Konu" butonuna tıkla
2. Kategori seç
3. Başlık yaz (min 10 karakter)
4. İçerik yaz (min 50 karakter)
5. Fotoğraf/video ekle (opsiyonel)
6. Etiketler ekle
7. Önizleme → Yayınla
```

### Uzman Doğrulama Süreci
```
1. Uzman başvurusu yap
2. Diploma/sertifika yükle
3. Referans bilgileri ver
4. Moderatör incelemesi
5. Onay → Uzman rozeti
6. Özel yetkiler aktif
```

## 📊 Başarı Metrikleri

### Kullanıcı Metrikleri
- Günlük aktif kullanıcı (DAU)
- Aylık aktif kullanıcı (MAU)
- Kullanıcı tutma oranı
- Ortalama oturum süresi

### İçerik Metrikleri
- Günlük yeni konu sayısı
- Günlük yorum sayısı
- Çözülen konu oranı
- Ortalama cevap süresi

### Etkileşim Metrikleri
- Beğeni oranı
- Paylaşım oranı
- Yorum/konu oranı
- Uzman katılım oranı

## 🎨 UI/UX Gereksinimleri

### Tasarım Prensipleri
- **Sadelik**: Temiz, anlaşılır arayüz
- **Erişilebilirlik**: WCAG 2.1 AA uyumlu
- **Responsive**: Mobil-first yaklaşım
- **Hız**: 3 saniye altında yüklenme
- **Tutarlılık**: Consistent design system

### Renk Paleti
- **Birincil**: Yeşil tonları (#22C55E)
- **İkincil**: Toprak tonları (#A3A3A3)
- **Vurgu**: Turuncu (#F97316)
- **Hata**: Kırmızı (#EF4444)
- **Başarı**: Yeşil (#10B981)

Bu gereksinim analizi, platformun tüm özelliklerini ve kullanıcı deneyimini kapsamlı şekilde tanımlamaktadır.
