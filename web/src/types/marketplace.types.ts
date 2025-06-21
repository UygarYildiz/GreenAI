// Marketplace ve E-ticaret Type Tanımları

export interface Product {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  currency: string;
  images: ProductImage[];
  category: ProductCategory;
  seller: Seller;
  stock: number;
  unit: string; // kg, adet, litre, etc.
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  isOrganic: boolean;
  harvestDate?: string;
  expiryDate?: string;
  location: Location;
  shippingOptions: ShippingOption[];
  specifications: ProductSpecification[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  status: 'active' | 'inactive' | 'out_of_stock' | 'pending';
  isPromoted: boolean;
  createdAt: string;
  updatedAt: string;
  slug: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId?: string;
  children?: ProductCategory[];
  productCount: number;
}

export interface Seller {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  avatar?: string;
  location: Location;
  rating: number;
  reviewCount: number;
  totalSales: number;
  memberSince: string;
  isVerified: boolean;
  verificationLevel: 'basic' | 'premium' | 'enterprise';
  businessType: 'individual' | 'company' | 'cooperative';
  taxNumber?: string;
  description?: string;
  specialties: string[];
  certifications: Certification[];
  responseTime: number; // hours
  responseRate: number; // percentage
}

export interface Location {
  city: string;
  district: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: number;
  isDefault: boolean;
  restrictions?: string[];
}

export interface ProductSpecification {
  name: string;
  value: string;
  unit?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  validUntil: string;
  documentUrl?: string;
}

// Shopping Cart Types
export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedShipping: ShippingOption;
  notes?: string;
  addedAt: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  updatedAt: string;
}

// Order Types
export interface Order {
  id: string;
  orderNumber: string;
  buyer: User;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  billingAddress: Address;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingOption;
  notes?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  product: Product;
  seller: Seller;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus;
  notes?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded' 
  | 'partially_refunded';

export type OrderItemStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

export interface Address {
  id?: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'cash_on_delivery';
  name: string;
  details?: any;
}

// Review Types
export interface ProductReview {
  id: string;
  product: Product;
  user: User;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

// Search and Filter Types
export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  isOrganic?: boolean;
  inStock?: boolean;
  sellerId?: string;
  rating?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface ProductSearchResult {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: ProductFilters;
}

// User type (simplified, should match auth types)
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  isVerified: boolean;
}
