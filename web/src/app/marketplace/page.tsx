'use client';

import { useState } from 'react';
import { useCategories, useFeaturedProducts, useProducts } from '@/hooks/use-marketplace';
import CategoryCard from '@/components/marketplace/category-card';
import ProductGrid from '@/components/marketplace/product-grid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  Package, 
  Star,
  ShoppingBag,
  Truck,
  Shield,
  Award
} from 'lucide-react';

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');
  
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: featuredProducts, isLoading: featuredLoading } = useFeaturedProducts(8);
  const { data: productsData, isLoading: productsLoading } = useProducts({ limit: 12 });

  const products = productsData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <h1 className="text-2xl font-bold text-green-600">
                  🌱 GreenAI Marketplace
                </h1>
              </Link>
              <nav className="hidden md:flex space-x-4">
                <Link href="/forum">
                  <Button variant="ghost">Forum</Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="ghost" className="text-green-600">Marketplace</Button>
                </Link>
                <Link href="/ai-assistant">
                  <Button variant="ghost">AI Asistan</Button>
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Ürün ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 w-64"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </Button>
              <Button>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Sepet (0)
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 rounded-3xl p-8 mb-8 shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 bg-green-400 rounded-full blur-xl"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-blue-400 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-32 w-24 h-24 bg-yellow-400 rounded-full blur-xl"></div>
          </div>
          
          <div className="relative z-10 text-center">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-green-700 bg-clip-text text-transparent mb-4">
              Tarım Ürünleri Pazarı
            </h2>
            <p className="text-xl text-gray-700 mb-6 max-w-3xl mx-auto">
              Taze, organik ve kaliteli tarım ürünlerini doğrudan üreticilerden satın alın. Güvenli ödeme, hızlı teslimat.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-green-500" />
                <span className="font-semibold">10,000+ Ürün</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="font-semibold">500+ Satıcı</span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold">Ücretsiz Kargo</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-500" />
                <span className="font-semibold">Güvenli Alışveriş</span>
              </div>
            </div>
          </div>
        </div>

        {/* Marketplace Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Ürün</p>
                  <p className="text-2xl font-bold text-gray-900">12,345</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Aktif Satıcı</p>
                  <p className="text-2xl font-bold text-gray-900">567</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Bu Hafta</p>
                  <p className="text-2xl font-bold text-gray-900">1,234</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ortalama Puan</p>
                  <p className="text-2xl font-bold text-gray-900">4.8</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'categories' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('categories')}
          >
            Kategoriler
          </Button>
          <Button
            variant={activeTab === 'products' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('products')}
          >
            Öne Çıkan Ürünler
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'categories' ? (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Ürün Kategorileri</h2>
              <Badge variant="secondary">
                {categories?.length || 0} kategori
              </Badge>
            </div>
            
            {categoriesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-gray-200 rounded w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories?.map((category) => (
                  <CategoryCard 
                    key={category.id} 
                    category={category}
                    variant="default"
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Öne Çıkan Ürünler</h2>
              <div className="flex space-x-2">
                <Badge variant="secondary">
                  {products.length} ürün
                </Badge>
                <Button variant="outline" size="sm">
                  <Award className="w-4 h-4 mr-2" />
                  Tümünü Gör
                </Button>
              </div>
            </div>

            <ProductGrid
              products={featuredProducts || []}
              loading={featuredLoading}
              variant="default"
              emptyMessage="Öne çıkan ürün bulunamadı"
              emptyDescription="Şu anda öne çıkan ürün bulunmuyor. Yakında yeni ürünler eklenecek!"
            />
          </section>
        )}
      </main>
    </div>
  );
}
