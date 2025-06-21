'use client';

import { useEffect, useState } from 'react';
import { useCategories } from '@/hooks/use-forum';
import CategoryList from '@/components/forum/category-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<string>('Kontrol ediliyor...');
  const { data: categories, isLoading, error } = useCategories();

  useEffect(() => {
    const checkAPI = async () => {
      try {
        const response = await fetch('http://localhost:5000/api');
        if (response.ok) {
          setApiStatus('✅ Backend API bağlantısı başarılı!');
        } else {
          setApiStatus('❌ Backend API bağlantısı başarısız!');
        }
      } catch (error) {
        setApiStatus('❌ Backend API bağlantısı başarısız!');
      }
    };

    checkAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-green-600">
                🌱 GreenAI Forum
              </h1>
            </div>
            <nav className="flex space-x-4">
              <Link href="/forum">
                <Button variant="ghost">Forum</Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="ghost">Marketplace</Button>
              </Link>
              <Link href="/ai-assistant">
                <Button variant="ghost">AI Asistan</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 rounded-3xl p-12 mb-12 shadow-xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-20 h-20 bg-green-400 rounded-full blur-xl"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-blue-400 rounded-full blur-xl"></div>
            <div className="absolute bottom-20 left-32 w-24 h-24 bg-yellow-400 rounded-full blur-xl"></div>
            <div className="absolute bottom-10 right-10 w-18 h-18 bg-green-500 rounded-full blur-xl"></div>
          </div>

          <div className="relative z-10 text-center">
            <div className="mb-6">
              <span className="text-6xl mb-4 block">🌱</span>
            </div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-green-700 bg-clip-text text-transparent mb-6">
              Çiftçiler için Modern Tarım Platformu
            </h2>
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
              Tarım bilginizi paylaşın, uzmanlardan tavsiye alın, sorularınıza AI destekli cevaplar bulun ve ürünlerinizi güvenle alıp satın.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Link href="/forum">
                <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3">
                  🚀 Forum'a Katıl
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="lg" className="border-2 border-green-600 text-green-700 hover:bg-green-50 shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3">
                  🛒 Ürünleri İncele
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-semibold">1000+ Aktif Çiftçi</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="font-semibold">500+ Uzman</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="font-semibold">AI Destekli Çözümler</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sistem Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{apiStatus}</p>
          </CardContent>
        </Card>

        {/* Forum Categories */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Forum Kategorileri</h3>
            <Link href="/forum">
              <Button variant="outline">Tümünü Gör</Button>
            </Link>
          </div>

          {error ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-red-600">
                  Forum kategorileri yüklenirken hata oluştu. Backend API'nin çalıştığından emin olun.
                </p>
              </CardContent>
            </Card>
          ) : (
            <CategoryList 
              categories={categories || []} 
              loading={isLoading}
              layout="grid"
            />
          )}
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                💬 Forum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Tarım uzmanları ve çiftçilerle bilgi paylaşımı yapın, sorularınıza cevap bulun.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                🛒 Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Tarım ürünleri, fide, tohum ve ekipmanları güvenle alıp satın.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                🤖 AI Asistan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Yapay zeka destekli tarım danışmanlığı ile sorularınıza anında cevap alın.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 GreenAI Forum. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
