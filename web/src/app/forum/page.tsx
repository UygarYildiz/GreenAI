'use client';

import { useState } from 'react';
import { useCategories, useTopics } from '@/hooks/use-forum';
import CategoryList from '@/components/forum/category-list';
import TopicCard from '@/components/forum/topic-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Search, Plus, TrendingUp, MessageCircle, Users } from 'lucide-react';

export default function ForumPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'topics'>('categories');
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: topicsData, isLoading: topicsLoading } = useTopics({ limit: 10 });

  const topics = topicsData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <h1 className="text-2xl font-bold text-green-600">
                  🌱 GreenAI Forum
                </h1>
              </Link>
              <nav className="hidden md:flex space-x-4">
                <Link href="/forum">
                  <Button variant="ghost" className="text-green-600">Forum</Button>
                </Link>
                <Link href="/marketplace">
                  <Button variant="ghost">Marketplace</Button>
                </Link>
                <Link href="/ai-assistant">
                  <Button variant="ghost">AI Asistan</Button>
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Forum'da ara..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Konu
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Forum Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Konu</p>
                  <p className="text-2xl font-bold text-gray-900">1,234</p>
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
                  <p className="text-sm font-medium text-gray-600">Aktif Üye</p>
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
                  <p className="text-2xl font-bold text-gray-900">89</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Çözülen</p>
                  <p className="text-2xl font-bold text-gray-900">456</p>
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
            variant={activeTab === 'topics' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('topics')}
          >
            Son Konular
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'categories' ? (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Forum Kategorileri</h2>
              <Badge variant="secondary">
                {categories?.length || 0} kategori
              </Badge>
            </div>
            
            <CategoryList 
              categories={categories || []} 
              loading={categoriesLoading}
              layout="grid"
            />
          </section>
        ) : (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Son Konular</h2>
              <div className="flex space-x-2">
                <Badge variant="secondary">
                  {topics.length} konu
                </Badge>
                <Button variant="outline" size="sm">
                  Filtrele
                </Button>
              </div>
            </div>

            {topicsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex space-x-4">
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                            <div className="flex space-x-4">
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : topics.length > 0 ? (
              <div className="space-y-4">
                {topics.map((topic) => (
                  <TopicCard 
                    key={topic.id} 
                    topic={topic}
                    showCategory={true}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Henüz konu bulunmuyor
                  </h3>
                  <p className="text-gray-600 mb-4">
                    İlk konuyu sen oluştur ve tartışmayı başlat!
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Konuyu Oluştur
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
