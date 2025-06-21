import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { 
  Product, 
  Order, 
  CartItem, 
  SellerProfile,
  ProductCategory,
  OrderStatus,
  PaymentStatus 
} from '../types/ecommerce';

export class EcommerceService {
  
  // ==================== PRODUCT MANAGEMENT ====================
  
  /**
   * Ürün oluştur
   */
  async createProduct(sellerId: string, productData: Partial<Product>): Promise<Product> {
    try {
      // Satıcı doğrulaması
      const seller = await this.getSellerProfile(sellerId);
      if (!seller?.isVerified) {
        throw new Error('Ürün eklemek için satıcı doğrulaması gerekli');
      }

      // Slug oluştur
      const slug = this.generateSlug(productData.name!);
      
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...productData,
          seller_id: sellerId,
          slug,
          status: 'draft',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Product created: ${data.id} by seller: ${sellerId}`);
      return data;

    } catch (error) {
      logger.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Ürün listesi getir (filtreleme ve arama ile)
   */
  async getProducts(filters: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: string;
    city?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ products: Product[]; total: number; hasMore: boolean }> {
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller_profiles!inner(
            business_name,
            city,
            seller_rating,
            is_verified
          ),
          product_categories!inner(
            name,
            slug
          ),
          product_images(
            image_url,
            alt_text,
            is_primary
          )
        `)
        .eq('status', 'active');

      // Filtreler uygula
      if (filters.category) {
        query = query.eq('product_categories.slug', filters.category);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      if (filters.city) {
        query = query.eq('seller_profiles.city', filters.city);
      }

      if (filters.featured) {
        query = query.eq('featured', true);
      }

      // Sayfalama
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        products: data || [],
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      };

    } catch (error) {
      logger.error('Failed to get products:', error);
      throw error;
    }
  }

  /**
   * Ürün detayı getir
   */
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller_profiles!inner(
            id,
            business_name,
            city,
            seller_rating,
            is_verified,
            total_sales
          ),
          product_categories!inner(
            name,
            slug
          ),
          product_images(
            image_url,
            alt_text,
            is_primary,
            sort_order
          ),
          product_variants(
            id,
            name,
            sku,
            price,
            stock_quantity,
            attributes
          )
        `)
        .eq('id', productId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Görüntülenme sayısını artır
      await this.incrementProductViews(productId);

      return data;

    } catch (error) {
      logger.error('Failed to get product:', error);
      throw error;
    }
  }

  // ==================== CART MANAGEMENT ====================

  /**
   * Sepete ürün ekle
   */
  async addToCart(userId: string, productId: string, variantId?: string, quantity: number = 1): Promise<CartItem> {
    try {
      // Ürün kontrolü
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Ürün bulunamadı');
      }

      // Stok kontrolü
      const availableStock = variantId 
        ? product.product_variants?.find(v => v.id === variantId)?.stock_quantity || 0
        : product.stock_quantity;

      if (availableStock < quantity) {
        throw new Error('Yeterli stok yok');
      }

      // Mevcut sepet kalemi kontrol et
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('variant_id', variantId || null)
        .single();

      let cartItem;

      if (existingItem) {
        // Mevcut kalemi güncelle
        const newQuantity = existingItem.quantity + quantity;
        
        if (newQuantity > availableStock) {
          throw new Error('Sepetteki miktar stok miktarını aşıyor');
        }

        const { data, error } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id)
          .select()
          .single();

        if (error) throw error;
        cartItem = data;

      } else {
        // Yeni kalem ekle
        const price = variantId 
          ? product.product_variants?.find(v => v.id === variantId)?.price || product.price
          : product.price;

        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id: productId,
            variant_id: variantId,
            quantity,
            price
          })
          .select()
          .single();

        if (error) throw error;
        cartItem = data;
      }

      logger.info(`Product added to cart: ${productId} for user: ${userId}`);
      return cartItem;

    } catch (error) {
      logger.error('Failed to add to cart:', error);
      throw error;
    }
  }

  /**
   * Sepet içeriğini getir
   */
  async getCart(userId: string): Promise<CartItem[]> {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products!inner(
            id,
            name,
            slug,
            price,
            stock_quantity,
            status,
            seller_id
          ),
          product_variants(
            id,
            name,
            price,
            stock_quantity
          )
        `)
        .eq('user_id', userId)
        .eq('products.status', 'active');

      if (error) throw error;

      return data || [];

    } catch (error) {
      logger.error('Failed to get cart:', error);
      throw error;
    }
  }

  // ==================== ORDER MANAGEMENT ====================

  /**
   * Sipariş oluştur
   */
  async createOrder(userId: string, orderData: {
    billingAddress: any;
    shippingAddress?: any;
    paymentMethod: string;
    shippingMethod: string;
    customerNote?: string;
  }): Promise<Order> {
    try {
      // Sepet kontrolü
      const cartItems = await this.getCart(userId);
      if (cartItems.length === 0) {
        throw new Error('Sepet boş');
      }

      // Sipariş numarası oluştur
      const orderNumber = this.generateOrderNumber();

      // Sipariş toplamlarını hesapla
      const totals = this.calculateOrderTotals(cartItems);

      // Sipariş oluştur
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: userId,
          status: 'pending',
          payment_status: 'pending',
          
          // Billing address
          billing_first_name: orderData.billingAddress.firstName,
          billing_last_name: orderData.billingAddress.lastName,
          billing_company: orderData.billingAddress.company,
          billing_address_1: orderData.billingAddress.address1,
          billing_address_2: orderData.billingAddress.address2,
          billing_city: orderData.billingAddress.city,
          billing_state: orderData.billingAddress.state,
          billing_postal_code: orderData.billingAddress.postalCode,
          billing_phone: orderData.billingAddress.phone,
          billing_email: orderData.billingAddress.email,
          
          // Shipping address (billing ile aynı ise)
          shipping_first_name: orderData.shippingAddress?.firstName || orderData.billingAddress.firstName,
          shipping_last_name: orderData.shippingAddress?.lastName || orderData.billingAddress.lastName,
          shipping_address_1: orderData.shippingAddress?.address1 || orderData.billingAddress.address1,
          shipping_city: orderData.shippingAddress?.city || orderData.billingAddress.city,
          
          // Totals
          subtotal: totals.subtotal,
          tax_total: totals.taxTotal,
          shipping_total: totals.shippingTotal,
          total: totals.total,
          
          // Payment & shipping
          payment_method: orderData.paymentMethod,
          shipping_method: orderData.shippingMethod,
          customer_note: orderData.customerNote
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Sipariş kalemlerini oluştur
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        seller_id: item.products.seller_id,
        name: item.products.name,
        sku: item.products.sku || item.product_variants?.id,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        product_data: {
          product: item.products,
          variant: item.product_variants
        }
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Sepeti temizle
      await this.clearCart(userId);

      // Stok güncelle
      await this.updateProductStock(cartItems);

      logger.info(`Order created: ${order.id} for user: ${userId}`);
      return order;

    } catch (error) {
      logger.error('Failed to create order:', error);
      throw error;
    }
  }

  // ==================== SELLER MANAGEMENT ====================

  /**
   * Satıcı profili getir
   */
  async getSellerProfile(sellerId: string): Promise<SellerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;

    } catch (error) {
      logger.error('Failed to get seller profile:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GRN-${timestamp.slice(-8)}-${random}`;
  }

  private calculateOrderTotals(cartItems: CartItem[]): {
    subtotal: number;
    taxTotal: number;
    shippingTotal: number;
    total: number;
  } {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxTotal = subtotal * 0.18; // %18 KDV
    const shippingTotal = 15; // Sabit kargo ücreti
    const total = subtotal + taxTotal + shippingTotal;

    return { subtotal, taxTotal, shippingTotal, total };
  }

  private async incrementProductViews(productId: string): Promise<void> {
    // Bu fonksiyon ayrı bir analytics tablosunda tutulabilir
    // Şimdilik basit bir implementasyon
  }

  private async clearCart(userId: string): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  private async updateProductStock(cartItems: CartItem[]): Promise<void> {
    // Stok güncellemelerini batch olarak yap
    for (const item of cartItems) {
      if (item.variant_id) {
        // Varyant stoku güncelle
        await supabase.rpc('decrement_variant_stock', {
          variant_id: item.variant_id,
          quantity: item.quantity
        });
      } else {
        // Ana ürün stoku güncelle
        await supabase.rpc('decrement_product_stock', {
          product_id: item.product_id,
          quantity: item.quantity
        });
      }
    }
  }
}
