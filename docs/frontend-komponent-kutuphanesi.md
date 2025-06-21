# 🧩 GreenAI Forum - Komponent Kütüphanesi Dokümantasyonu

## 📋 Komponent Hiyerarşisi

### 🏗️ Layout Komponenleri

#### `RootLayout`
Ana layout wrapper - tüm sayfaları sarar
```typescript
interface RootLayoutProps {
  children: React.ReactNode;
}
```

#### `Header`
Site başlığı ve ana navigasyon
```typescript
interface HeaderProps {
  user?: User | null;
  onMenuToggle?: () => void;
}

// Alt komponenler:
├── Navigation        # Ana menü
├── UserMenu         # Kullanıcı dropdown
├── SearchBar        # Arama çubuğu
└── NotificationBell # Bildirim ikonu
```

#### `Sidebar`
Yan menü (kategoriler, filtreler)
```typescript
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  categories?: Category[];
}
```

#### `Footer`
Site alt bilgisi
```typescript
interface FooterProps {
  showNewsletter?: boolean;
  showSocialLinks?: boolean;
}
```

#### `MobileNavigation`
Mobil alt navigasyon
```typescript
interface MobileNavigationProps {
  activeRoute: string;
  notificationCount?: number;
}
```

### 💬 Forum Komponenleri

#### `CategoryList`
Kategori listesi container
```typescript
interface CategoryListProps {
  categories: Category[];
  loading?: boolean;
  layout?: 'grid' | 'list';
}
```

#### `CategoryCard`
Tekil kategori kartı
```typescript
interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    color: string;
    topicCount: number;
    replyCount: number;
  };
  variant?: 'default' | 'compact';
}
```

#### `TopicList`
Konu listesi container
```typescript
interface TopicListProps {
  topics: Topic[];
  loading?: boolean;
  pagination?: PaginationData;
  onPageChange?: (page: number) => void;
}
```

#### `TopicCard`
Tekil konu kartı
```typescript
interface TopicCardProps {
  topic: {
    id: string;
    title: string;
    excerpt: string;
    author: User;
    category: Category;
    viewCount: number;
    replyCount: number;
    likeCount: number;
    createdAt: string;
    isPinned: boolean;
    isSolved: boolean;
  };
  showCategory?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}
```

#### `TopicDetail`
Konu detay sayfası
```typescript
interface TopicDetailProps {
  topic: TopicWithReplies;
  onReply?: (content: string) => void;
  onLike?: () => void;
  onBookmark?: () => void;
}

// Alt komponenler:
├── TopicHeader      # Başlık ve meta bilgiler
├── TopicContent     # Konu içeriği
├── TopicActions     # Beğeni, yer imi butonları
└── ReplyList        # Yorumlar listesi
```

#### `ReplyCard`
Tekil yorum kartı
```typescript
interface ReplyCardProps {
  reply: {
    id: string;
    content: string;
    author: User;
    createdAt: string;
    likeCount: number;
    isAccepted?: boolean;
  };
  onLike?: () => void;
  onAccept?: () => void;
  canAccept?: boolean;
}
```

#### `ReplyForm`
Yorum yazma formu
```typescript
interface ReplyFormProps {
  topicId: string;
  onSubmit: (content: string) => void;
  loading?: boolean;
  placeholder?: string;
}
```

#### `TopicForm`
Konu oluşturma formu
```typescript
interface TopicFormProps {
  categories: Category[];
  onSubmit: (data: TopicFormData) => void;
  loading?: boolean;
  initialData?: Partial<TopicFormData>;
}
```

### 🛒 E-ticaret Komponenleri

#### `ProductGrid`
Ürün grid listesi
```typescript
interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  columns?: 2 | 3 | 4;
  pagination?: PaginationData;
}
```

#### `ProductCard`
Tekil ürün kartı
```typescript
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    seller: Seller;
    images: string[];
    stock: number;
    location: string;
  };
  variant?: 'default' | 'compact' | 'featured';
  showQuickActions?: boolean;
}
```

#### `ProductDetail`
Ürün detay sayfası
```typescript
interface ProductDetailProps {
  product: ProductWithDetails;
  onAddToCart?: (quantity: number) => void;
  onContactSeller?: () => void;
}

// Alt komponenler:
├── ProductGallery   # Ürün resimleri
├── ProductInfo      # Ürün bilgileri
├── ProductActions   # Satın alma butonları
└── ProductReviews   # Ürün yorumları
```

#### `ProductFilters`
Ürün filtreleme
```typescript
interface ProductFiltersProps {
  categories: Category[];
  priceRange: [number, number];
  locations: string[];
  onFilterChange: (filters: ProductFilters) => void;
  activeFilters: ProductFilters;
}
```

#### `ShoppingCart`
Alışveriş sepeti
```typescript
interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}
```

#### `SellerDashboard`
Satıcı paneli
```typescript
interface SellerDashboardProps {
  seller: Seller;
  products: Product[];
  orders: Order[];
  stats: SellerStats;
}
```

### 🤖 AI Asistan Komponenleri

#### `ChatInterface`
AI sohbet arayüzü
```typescript
interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  loading?: boolean;
  suggestions?: string[];
}

// Alt komponenler:
├── ChatMessages     # Mesaj listesi
├── MessageBubble    # Tekil mesaj balonu
└── ChatInput        # Mesaj yazma alanı
```

#### `AISuggestions`
AI önerileri
```typescript
interface AISuggestionsProps {
  suggestions: {
    type: 'topic' | 'expert' | 'product';
    title: string;
    description: string;
    url: string;
  }[];
  onSuggestionClick: (suggestion: Suggestion) => void;
}
```

#### `QuestionForm`
Soru sorma formu
```typescript
interface QuestionFormProps {
  onSubmit: (question: string, context?: string) => void;
  loading?: boolean;
  categories: string[];
}
```

### 🎨 Ortak UI Komponenleri

#### `Button`
Buton bileşeni
```typescript
interface ButtonProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'default' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

#### `Card`
Kart container
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'default' | 'lg';
  children: React.ReactNode;
  className?: string;
}
```

#### `Modal`
Modal dialog
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  children: React.ReactNode;
}
```

#### `Toast`
Bildirim mesajları
```typescript
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
}
```

#### `Loading`
Yükleme animasyonları
```typescript
interface LoadingProps {
  variant?: 'spinner' | 'skeleton' | 'dots';
  size?: 'sm' | 'default' | 'lg';
  text?: string;
}
```

#### `Pagination`
Sayfalama
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  size?: 'sm' | 'default' | 'lg';
}
```

#### `Badge`
Rozet/etiket
```typescript
interface BadgeProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'default' | 'lg';
  children: React.ReactNode;
}
```

#### `Avatar`
Kullanıcı avatarı
```typescript
interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  fallback?: string;
  online?: boolean;
}
```

#### `Dropdown`
Dropdown menü
```typescript
interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onItemClick: (item: DropdownItem) => void;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}
```

#### `FileUpload`
Dosya yükleme
```typescript
interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload: (files: File[]) => void;
  loading?: boolean;
  preview?: boolean;
}
```

#### `RichTextEditor`
Zengin metin editörü
```typescript
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  toolbar?: ToolbarItem[];
  maxLength?: number;
}
```

## 🎨 Komponent Varyantları

### Button Varyantları
```typescript
// Primary - Ana eylemler için
<Button variant="default">Gönder</Button>

// Secondary - İkincil eylemler için
<Button variant="secondary">İptal</Button>

// Success - Başarılı eylemler için
<Button variant="success">Onayla</Button>

// Warning - Uyarı gerektiren eylemler için
<Button variant="warning">Dikkat</Button>

// Danger - Tehlikeli eylemler için
<Button variant="danger">Sil</Button>
```

### Card Varyantları
```typescript
// Default - Standart kart
<Card variant="default">İçerik</Card>

// Elevated - Gölgeli kart
<Card variant="elevated">İçerik</Card>

// Bordered - Kenarlıklı kart
<Card variant="bordered">İçerik</Card>
```

## 📱 Responsive Davranışlar

### Breakpoint Bazlı Görünüm
```typescript
// TopicCard responsive örneği
<div className="
  p-4 bg-white rounded-lg shadow-sm border
  hover:shadow-md transition-shadow
  sm:p-6 md:p-4 lg:p-6
">
  <h3 className="
    text-lg font-semibold text-gray-900
    sm:text-xl md:text-lg lg:text-xl
    line-clamp-2
  ">
    {topic.title}
  </h3>
</div>
```

### Mobil Optimizasyonları
- **Touch-friendly**: Minimum 44px buton boyutu
- **Swipe gestures**: Kart navigasyonu için
- **Responsive typography**: Ekran boyutuna göre font ölçekleme
- **Adaptive layouts**: Mobilde tek sütun, desktop'ta çoklu sütun

Bu komponent kütüphanesi, GreenAI Forum frontend uygulamasının tüm UI ihtiyaçlarını karşılayacak şekilde tasarlanmıştır. Her komponent, mevcut backend API'yi destekleyecek ve Türk çiftçilerinin kullanım alışkanlıklarına uygun olacak şekilde optimize edilmiştir.
