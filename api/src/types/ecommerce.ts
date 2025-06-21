// ==================== ENUMS ====================

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum VerificationLevel {
  UNVERIFIED = 'unverified',
  BASIC = 'basic',
  BUSINESS = 'business',
  PREMIUM = 'premium',
  CORPORATE = 'corporate'
}

export enum BusinessType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
  COOPERATIVE = 'cooperative'
}

// ==================== INTERFACES ====================

export interface SellerProfile {
  id: string;
  userId: string;
  businessName: string;
  businessType: BusinessType;
  taxNumber?: string;
  tradeRegistryNumber?: string;
  address: string;
  city: string;
  district?: string;
  postalCode?: string;
  phone: string;
  isVerified: boolean;
  verificationLevel: VerificationLevel;
  verificationDocuments?: any;
  sellerRating: number;
  totalSales: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  stockQuantity: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isDigital: boolean;
  requiresShipping: boolean;
  status: ProductStatus;
  featured: boolean;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  sellerProfile?: SellerProfile;
  category?: ProductCategory;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  price?: number;
  stockQuantity: number;
  attributes: Record<string, any>;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  variantId?: string;
  imageUrl: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  product?: Product;
  variant?: ProductVariant;
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  
  // Billing address
  billingFirstName: string;
  billingLastName: string;
  billingCompany?: string;
  billingAddress1: string;
  billingAddress2?: string;
  billingCity: string;
  billingState?: string;
  billingPostalCode: string;
  billingCountry: string;
  billingPhone?: string;
  billingEmail: string;
  
  // Shipping address
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingCompany?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  shippingPhone?: string;
  
  // Order totals
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  
  // Payment info
  paymentMethod?: string;
  paymentMethodTitle?: string;
  transactionId?: string;
  
  // Shipping info
  shippingMethod?: string;
  shippingMethodTitle?: string;
  trackingNumber?: string;
  
  // Notes
  customerNote?: string;
  adminNote?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations
  items?: OrderItem[];
  user?: any;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  sellerId: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
  productData: any;
  createdAt: string;
  
  // Relations
  product?: Product;
  variant?: ProductVariant;
  seller?: SellerProfile;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  settings: Record<string, any>;
}

export interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  freeShippingThreshold?: number;
  estimatedDays: number;
  isActive: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  isApproved: boolean;
  createdAt: string;
  
  // Relations
  user?: any;
  product?: Product;
}

export interface Wishlist {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  
  // Relations
  product?: Product;
}

// ==================== REQUEST/RESPONSE TYPES ====================

export interface CreateProductRequest {
  name: string;
  categoryId: string;
  description: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  stockQuantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags?: string[];
  images?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  status?: ProductStatus;
  featured?: boolean;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sellerId?: string;
  city?: string;
  featured?: boolean;
  inStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'name' | 'created_at' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CreateOrderRequest {
  billingAddress: Address;
  shippingAddress?: Address;
  paymentMethod: string;
  shippingMethod: string;
  customerNote?: string;
  useShippingAsBilling?: boolean;
}

export interface SellerRegistrationRequest {
  businessName: string;
  businessType: BusinessType;
  taxNumber?: string;
  tradeRegistryNumber?: string;
  address: string;
  city: string;
  district?: string;
  postalCode: string;
  phone: string;
  documents?: File[];
}

// ==================== ANALYTICS TYPES ====================

export interface SalesAnalytics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    product: Product;
    salesCount: number;
    revenue: number;
  }>;
  salesByCategory: Array<{
    category: ProductCategory;
    salesCount: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    salesCount: number;
    revenue: number;
  }>;
}

export interface SellerAnalytics {
  totalRevenue: number;
  totalOrders: number;
  averageRating: number;
  totalProducts: number;
  activeProducts: number;
  pendingOrders: number;
  recentOrders: Order[];
  topSellingProducts: Array<{
    product: Product;
    salesCount: number;
    revenue: number;
  }>;
}

// ==================== ERROR TYPES ====================

export class EcommerceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'EcommerceError';
  }
}

export class InsufficientStockError extends EcommerceError {
  constructor(productName: string, availableStock: number) {
    super(
      `Insufficient stock for ${productName}. Available: ${availableStock}`,
      'INSUFFICIENT_STOCK',
      400
    );
  }
}

export class ProductNotFoundError extends EcommerceError {
  constructor(productId: string) {
    super(
      `Product not found: ${productId}`,
      'PRODUCT_NOT_FOUND',
      404
    );
  }
}

export class UnverifiedSellerError extends EcommerceError {
  constructor() {
    super(
      'Seller verification required for this action',
      'UNVERIFIED_SELLER',
      403
    );
  }
}
