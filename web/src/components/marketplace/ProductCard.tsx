'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, 
  ShoppingCart, 
  Heart, 
  Shield, 
  MapPin,
  Eye,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  stockQuantity: number;
  images: Array<{
    imageUrl: string;
    altText?: string;
    isPrimary: boolean;
  }>;
  seller: {
    id: string;
    businessName: string;
    city: string;
    sellerRating: number;
    isVerified: boolean;
    verificationLevel: string;
  };
  category: {
    name: string;
    slug: string;
  };
  featured?: boolean;
  forumContext?: {
    topicId: string;
    topicTitle: string;
  };
}

interface ProductCardProps {
  product: Product;
  showSellerInfo?: boolean;
  compact?: boolean;
  onAddToCart?: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
  isInWishlist?: boolean;
}

export function ProductCard({
  product,
  showSellerInfo = true,
  compact = false,
  onAddToCart,
  onToggleWishlist,
  isInWishlist = false
}: ProductCardProps) {
  const { toast } = useToast();
  const { addToCart, isLoading } = useCart();

  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  const discountPercentage = product.comparePrice 
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, undefined, 1);
      toast({
        title: 'Ürün sepete eklendi',
        description: `${product.name} sepetinize eklendi.`,
      });
      onAddToCart?.(product.id);
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Ürün sepete eklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleWishlist = () => {
    onToggleWishlist?.(product.id);
    toast({
      title: isInWishlist ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi',
      description: `${product.name} ${isInWishlist ? 'favorilerden çıkarıldı' : 'favorilerinize eklendi'}.`,
    });
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 ${compact ? 'h-auto' : 'h-full'}`}>
      <div className="relative overflow-hidden">
        <Link href={`/marketplace/products/${product.slug}`}>
          <div className={`relative ${compact ? 'h-32' : 'h-48'} bg-gray-100`}>
            {primaryImage ? (
              <Image
                src={primaryImage.imageUrl}
                alt={primaryImage.altText || product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-gray-400">Resim yok</span>
              </div>
            )}
          </div>
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.featured && (
            <Badge className="bg-orange-500 text-white text-xs">
              Öne Çıkan
            </Badge>
          )}
          {discountPercentage > 0 && (
            <Badge className="bg-red-500 text-white text-xs">
              %{discountPercentage} İndirim
            </Badge>
          )}
          {product.forumContext && (
            <Badge className="bg-blue-500 text-white text-xs">
              Forum'dan
            </Badge>
          )}
        </div>

        {/* Verification Badge */}
        {product.seller.isVerified && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-600 text-white text-xs flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Doğrulanmış
            </Badge>
          </div>
        )}

        {/* Wishlist Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
          onClick={handleToggleWishlist}
        >
          <Heart 
            className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
          />
        </Button>

        {/* Stock Status */}
        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm">
              Stokta Yok
            </Badge>
          </div>
        )}
      </div>

      <CardContent className={`p-3 ${compact ? 'space-y-2' : 'space-y-3'}`}>
        {/* Product Name */}
        <Link href={`/marketplace/products/${product.slug}`}>
          <h3 className={`font-semibold hover:text-green-600 transition-colors line-clamp-2 ${
            compact ? 'text-sm' : 'text-base'
          }`}>
            {product.name}
          </h3>
        </Link>

        {/* Short Description */}
        {!compact && product.shortDescription && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {product.shortDescription}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className={`font-bold text-green-600 ${compact ? 'text-lg' : 'text-xl'}`}>
            {formatPrice(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>

        {/* Seller Info */}
        {showSellerInfo && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={`/api/avatars/${product.seller.id}`} />
                <AvatarFallback className="text-xs">
                  {product.seller.businessName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs text-gray-600 truncate max-w-24">
                  {product.seller.businessName}
                </span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {product.seller.city}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">
                {product.seller.sellerRating.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {/* Forum Context */}
        {product.forumContext && (
          <div className="flex items-center gap-1 p-2 bg-blue-50 rounded-lg">
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <Link 
              href={`/forum/topics/${product.forumContext.topicId}`}
              className="text-xs text-blue-600 hover:underline truncate"
            >
              {product.forumContext.topicTitle}
            </Link>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex gap-2 ${compact ? 'flex-col' : ''}`}>
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            className="flex-1"
            onClick={handleAddToCart}
            disabled={product.stockQuantity === 0 || isLoading}
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            {compact ? 'Sepet' : 'Sepete Ekle'}
          </Button>
          
          <Link href={`/marketplace/products/${product.slug}`}>
            <Button 
              size={compact ? "sm" : "default"}
              className="flex-1 w-full"
              disabled={product.stockQuantity === 0}
            >
              {compact ? 'Al' : 'Hemen Al'}
            </Button>
          </Link>
        </div>

        {/* Stock Info */}
        {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
          <div className="text-xs text-orange-600 font-medium">
            Son {product.stockQuantity} adet!
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={compact ? 'h-auto' : 'h-full'}>
      <div className={`bg-gray-200 animate-pulse ${compact ? 'h-32' : 'h-48'}`} />
      <CardContent className={`p-3 space-y-3 ${compact ? 'space-y-2' : ''}`}>
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        {!compact && <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />}
        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
          <div className="h-8 bg-gray-200 rounded animate-pulse flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}
