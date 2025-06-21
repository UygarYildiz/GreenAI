import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCategory } from '@/types/marketplace.types';
import { formatNumber } from '@/lib/utils';
import { ChevronRight, Package } from 'lucide-react';

interface CategoryCardProps {
  category: ProductCategory;
  variant?: 'default' | 'compact' | 'featured';
  showProductCount?: boolean;
}

export default function CategoryCard({ 
  category, 
  variant = 'default',
  showProductCount = true 
}: CategoryCardProps) {
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <Link href={`/marketplace/categories/${category.slug}`}>
      <Card className={`group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${
        isFeatured ? 'border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50' : 'bg-gradient-to-br from-white to-gray-50'
      }`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100" />
        </div>
        
        {/* Colored Top Border */}
        <div className="h-1 w-full bg-gradient-to-r from-green-500 to-blue-500" />
        
        <CardHeader className={`${isCompact ? 'p-4' : 'p-6'} pb-3 relative z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Category Icon */}
              <div className={`${isCompact ? 'w-12 h-12' : 'w-16 h-16'} rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg bg-gradient-to-br from-green-100 to-blue-100 border-2 border-green-200`}>
                {category.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-gray-900 group-hover:text-green-600 transition-colors ${
                  isCompact ? 'text-lg' : 'text-xl'
                } mb-1`}>
                  {category.name}
                </h3>
                <p className={`text-gray-600 line-clamp-2 leading-relaxed ${
                  isCompact ? 'text-sm' : 'text-base'
                }`}>
                  {category.description}
                </p>
              </div>
            </div>
            
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all duration-300" />
          </div>
        </CardHeader>

        <CardContent className={`${isCompact ? 'p-4' : 'p-6'} pt-0 relative z-10`}>
          <div className="flex items-center justify-between">
            {/* Product Count */}
            {showProductCount && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-700">
                  {formatNumber(category.productCount)} ürün
                </span>
              </div>
            )}
            
            {/* Active Badge */}
            <Badge 
              className="text-white font-semibold px-3 py-1 shadow-md bg-gradient-to-r from-green-500 to-blue-500"
            >
              <Package className="w-3 h-3 mr-1" />
              Aktif
            </Badge>
          </div>
          
          {/* Subcategories Preview */}
          {category.children && category.children.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-1">
                {category.children.slice(0, 3).map((child) => (
                  <Badge 
                    key={child.id}
                    variant="outline" 
                    className="text-xs text-gray-600 hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    {child.name}
                  </Badge>
                ))}
                {category.children.length > 3 && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    +{category.children.length - 3} daha
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Activity Indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Bu hafta</span>
              <span>+{Math.floor(Math.random() * 50 + 10)} yeni ürün</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-blue-400"
                style={{ 
                  width: `${Math.floor(Math.random() * 60 + 30)}%`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
