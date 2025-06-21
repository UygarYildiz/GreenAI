import { Category } from '@/types/forum.types';
import CategoryCard from './category-card';

interface CategoryListProps {
  categories: Category[];
  loading?: boolean;
  layout?: 'grid' | 'list';
  variant?: 'default' | 'compact';
}

export default function CategoryList({ 
  categories, 
  loading = false, 
  layout = 'grid',
  variant = 'default'
}: CategoryListProps) {
  if (loading) {
    return (
      <div className={`${layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div className="flex justify-between">
                <div className="flex space-x-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📂</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Henüz kategori bulunmuyor
        </h3>
        <p className="text-gray-600">
          Forum kategorileri yakında eklenecek.
        </p>
      </div>
    );
  }

  return (
    <div className={`${layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}`}>
      {categories.map((category) => (
        <CategoryCard 
          key={category.id} 
          category={category} 
          variant={variant}
        />
      ))}
    </div>
  );
}
