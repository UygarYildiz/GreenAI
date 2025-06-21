import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product } from '@/types/marketplace.types';
import { formatPrice, formatNumber } from '@/lib/utils';
import { 
  Heart, 
  ShoppingCart, 
  Star, 
  MapPin, 
  Truck, 
  Shield,
  Eye,
  Clock
} from 'lucide-react';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  showWishlist?: boolean;
  onAddToCart?: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
  isInWishlist?: boolean;
}

export default function ProductCard({ 
  product, 
  variant = 'default',
  showWishlist = true,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';
  
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWishlist?.(product.id);
  };

  return (
    <Card className={`group hover:shadow-xl transition-all duration-300 overflow-hidden ${
      isFeatured ? 'border-2 border-green-200 shadow-lg' : 'hover:-translate-y-1'
    }`}>
      <Link href={`/marketplace/products/${product.slug}`}>
        <div className="relative">
          {/* Product Image */}
          <div className={`relative overflow-hidden ${isCompact ? 'h-40' : 'h-48'} bg-gray-100`}>
            {primaryImage && !imageError ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt || product.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="text-4xl">🌱</div>
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isOrganic && (
                <Badge className="bg-green-600 text-white text-xs">
                  🌿 Organik
                </Badge>
              )}
              {hasDiscount && (
                <Badge className="bg-red-500 text-white text-xs">
                  %{discountPercentage} İndirim
                </Badge>
              )}
              {product.isPromoted && (
                <Badge className="bg-yellow-500 text-white text-xs">
                  ⭐ Öne Çıkan
                </Badge>
              )}
            </div>

            {/* Wishlist Button */}
            {showWishlist && (
              <button
                onClick={handleToggleWishlist}
                className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-200 ${
                  isInWishlist 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Stock Status */}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="destructive" className="text-sm">
                  Tükendi
                </Badge>
              </div>
            )}
          </div>

          <CardHeader className={`${isCompact ? 'p-3' : 'p-4'} pb-2`}>
            {/* Seller Info */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{product.location.city}</span>
              </div>
              {product.seller.isVerified && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Doğrulanmış
                </Badge>
              )}
            </div>

            {/* Product Title */}
            <h3 className={`font-semibold text-gray-900 line-clamp-2 group-hover:text-green-600 transition-colors ${
              isCompact ? 'text-sm' : 'text-base'
            }`}>
              {product.title}
            </h3>

            {/* Short Description */}
            {!isCompact && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {product.shortDescription}
              </p>
            )}
          </CardHeader>

          <CardContent className={`${isCompact ? 'p-3' : 'p-4'} pt-0`}>
            {/* Price */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`font-bold text-green-600 ${isCompact ? 'text-lg' : 'text-xl'}`}>
                {formatPrice(product.price, product.currency)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(product.originalPrice!, product.currency)}
                </span>
              )}
              <span className="text-xs text-gray-500">/ {product.unit}</span>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatNumber(product.soldCount)} satıldı</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Stok: {product.stock}</span>
              </div>
            </div>

            {/* Shipping Info */}
            {product.shippingOptions.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                <Truck className="w-3 h-3" />
                <span>
                  {product.shippingOptions[0].price === 0 
                    ? 'Ücretsiz Kargo' 
                    : `Kargo: ${formatPrice(product.shippingOptions[0].price, product.currency)}`
                  }
                </span>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="w-full"
              size={isCompact ? "sm" : "default"}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {product.stock === 0 ? 'Tükendi' : 'Sepete Ekle'}
            </Button>
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}
