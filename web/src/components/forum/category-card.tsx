import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Category } from '@/types/forum.types';
import { formatNumber } from '@/lib/utils';

interface CategoryCardProps {
  category: Category;
  variant?: 'default' | 'compact';
}

export default function CategoryCard({ category, variant = 'default' }: CategoryCardProps) {
  const isCompact = variant === 'compact';

  return (
    <Link href={`/forum/categories/${category.slug}`}>
      <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden relative bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 80%, ${category.color}40 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${category.color}30 0%, transparent 50%)`,
            }}
          />
        </div>

        {/* Colored Top Border */}
        <div
          className="h-1 w-full"
          style={{ backgroundColor: category.color }}
        />

        <CardHeader className={isCompact ? "pb-2 relative z-10" : "pb-4 relative z-10"}>
          <div className="flex items-center space-x-4">
            <div
              className={`${isCompact ? 'w-12 h-12' : 'w-16 h-16'} rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}
              style={{
                background: `linear-gradient(135deg, ${category.color}20, ${category.color}40)`,
                border: `2px solid ${category.color}30`
              }}
            >
              {category.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-gray-900 group-hover:text-green-600 transition-colors ${isCompact ? 'text-lg' : 'text-xl'} mb-2`}>
                {category.name}
              </h3>
              <p className={`text-gray-600 line-clamp-2 leading-relaxed ${isCompact ? 'text-sm' : 'text-base'}`}>
                {category.description}
              </p>
            </div>
          </div>
        </CardHeader>
        
        {!isCompact && (
          <CardContent className="pt-0 pb-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex space-x-6">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {formatNumber(category.topicCount)} konu
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full opacity-60"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {formatNumber(category.replyCount)} yanıt
                  </span>
                </div>
              </div>
              <Badge
                className="text-white font-semibold px-3 py-1 shadow-md"
                style={{
                  backgroundColor: category.color,
                  boxShadow: `0 4px 12px ${category.color}40`
                }}
              >
                ✨ Aktif
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Bu hafta</span>
                <span>+{Math.floor(Math.random() * 20 + 5)} yeni</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: category.color,
                    width: `${Math.floor(Math.random() * 60 + 30)}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        )}

        {isCompact && (
          <CardContent className="pt-0 pb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4 text-sm text-gray-600">
                <span className="font-medium">{formatNumber(category.topicCount)} konu</span>
                <span className="font-medium">{formatNumber(category.replyCount)} yanıt</span>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
