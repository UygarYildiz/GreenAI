const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Demo data
const demoCategories = [
  {
    id: '1',
    name: 'Genel Tartışma',
    slug: 'genel-tartisma',
    description: 'Genel tarım konuları ve sohbet',
    icon: '💬',
    color: '#3B82F6',
    topicCount: 45,
    replyCount: 234
  },
  {
    id: '2',
    name: 'Sebze Yetiştiriciliği',
    slug: 'sebze-yetistiriciligi',
    description: 'Sebze ekimi, bakımı ve hasadı',
    icon: '🥕',
    color: '#10B981',
    topicCount: 78,
    replyCount: 456
  },
  {
    id: '3',
    name: 'Meyve Yetiştiriciliği',
    slug: 'meyve-yetistiriciligi',
    description: 'Meyve ağaçları ve bakımı',
    icon: '🍎',
    color: '#F59E0B',
    topicCount: 56,
    replyCount: 289
  },
  {
    id: '4',
    name: 'Organik Tarım',
    slug: 'organik-tarim',
    description: 'Organik üretim yöntemleri',
    icon: '🌿',
    color: '#059669',
    topicCount: 34,
    replyCount: 178
  }
];

const demoTopics = [
  {
    id: '1',
    title: 'Domates Yetiştiriciliğinde Dikkat Edilmesi Gerekenler',
    slug: 'domates-yetistiriciligi-dikkat-edilmesi-gerekenler',
    excerpt: 'Domates yetiştirirken toprak seçimi, sulama ve gübreleme konularında önemli noktalar...',
    categoryId: '2',
    author: {
      id: 'user1',
      username: 'tarimci_ahmet',
      fullName: 'Ahmet Yılmaz',
      userType: 'farmer',
      isVerified: true
    },
    viewCount: 156,
    replyCount: 12,
    likeCount: 23,
    createdAt: '2024-01-15T10:30:00Z',
    isPinned: false,
    isSolved: true
  },
  {
    id: '2',
    title: 'Organik Gübre Yapımı ve Kullanımı',
    slug: 'organik-gubre-yapimi-ve-kullanimi',
    excerpt: 'Evde organik gübre nasıl yapılır? Hangi malzemeler kullanılır? Uygulama teknikleri...',
    categoryId: '4',
    author: {
      id: 'user2',
      username: 'organik_uzman',
      fullName: 'Dr. Fatma Kaya',
      userType: 'expert',
      isVerified: true
    },
    viewCount: 234,
    replyCount: 18,
    likeCount: 45,
    createdAt: '2024-01-14T14:20:00Z',
    isPinned: true,
    isSolved: false
  }
];

const demoProducts = [
  {
    id: '1',
    name: 'Organik Domates Fidesi',
    description: 'Sertifikalı organik domates fidesi, yüksek verim',
    price: 15.50,
    currency: 'TRY',
    category: 'Fide',
    seller: {
      id: 'seller1',
      name: 'Yeşil Tarım',
      rating: 4.8,
      verified: true
    },
    images: ['/images/domates-fide.jpg'],
    stock: 100,
    location: 'Antalya'
  },
  {
    id: '2',
    name: 'Organik Gübre 25kg',
    description: 'Doğal organik gübre, tüm bitkiler için uygun',
    price: 85.00,
    currency: 'TRY',
    category: 'Gübre',
    seller: {
      id: 'seller2',
      name: 'Doğal Tarım',
      rating: 4.6,
      verified: true
    },
    images: ['/images/organik-gubre.jpg'],
    stock: 50,
    location: 'İzmir'
  }
];

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'demo'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'GreenAI Forum API - Demo',
    version: '1.0.0',
    description: 'Çiftçiler ve tarım uzmanları için forum platformu API (Demo)',
    endpoints: {
      auth: '/api/auth',
      forum: '/api/forum',
      ai: '/api/ai',
      ecommerce: '/api/ecommerce',
      membership: '/api/membership'
    },
    documentation: '/api/docs',
    health: '/health',
    demo: true
  });
});

// Forum routes
app.get('/api/forum/categories', (req, res) => {
  res.json({
    success: true,
    data: demoCategories
  });
});

app.get('/api/forum/topics', (req, res) => {
  const { categoryId, page = 1, limit = 20 } = req.query;
  
  let filteredTopics = demoTopics;
  if (categoryId) {
    filteredTopics = demoTopics.filter(topic => topic.categoryId === categoryId);
  }
  
  res.json({
    success: true,
    data: filteredTopics,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredTopics.length,
      totalPages: Math.ceil(filteredTopics.length / limit),
      hasNext: false,
      hasPrev: false
    }
  });
});

app.get('/api/forum/search', (req, res) => {
  const { q } = req.query;
  
  const searchResults = demoTopics.filter(topic => 
    topic.title.toLowerCase().includes(q.toLowerCase()) ||
    topic.excerpt.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json({
    success: true,
    data: searchResults.map(topic => ({
      ...topic,
      type: 'topic',
      relevanceScore: 85
    })),
    pagination: {
      page: 1,
      limit: 20,
      total: searchResults.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });
});

// E-commerce routes
app.get('/api/ecommerce/products', (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;
  
  let filteredProducts = demoProducts;
  
  if (search) {
    filteredProducts = filteredProducts.filter(product =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (category) {
    filteredProducts = filteredProducts.filter(product =>
      product.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  res.json({
    success: true,
    data: filteredProducts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredProducts.length,
      totalPages: Math.ceil(filteredProducts.length / limit),
      hasNext: false,
      hasPrev: false
    }
  });
});

app.get('/api/ecommerce/categories', (req, res) => {
  const categories = [
    { id: '1', name: 'Fide', slug: 'fide', productCount: 150 },
    { id: '2', name: 'Tohum', slug: 'tohum', productCount: 200 },
    { id: '3', name: 'Gübre', slug: 'gubre', productCount: 80 },
    { id: '4', name: 'Tarım Aleti', slug: 'tarim-aleti', productCount: 120 }
  ];
  
  res.json({
    success: true,
    data: categories
  });
});

app.get('/api/ecommerce/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalProducts: 640,
      totalSellers: 85,
      totalOrders: 1250,
      totalRevenue: 125000,
      topCategories: [
        { name: 'Tohum', count: 200 },
        { name: 'Fide', count: 150 },
        { name: 'Tarım Aleti', count: 120 }
      ]
    }
  });
});

// AI routes
app.get('/api/ai/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      version: '1.0.0',
      model: 'gemini-2.0-flash',
      features: [
        'question_answering',
        'content_suggestions',
        'expert_matching',
        'crop_diagnosis'
      ],
      limits: {
        questionsPerMinute: 10,
        questionsPerDay: 100
      }
    }
  });
});

// Membership routes
app.get('/api/membership/plans', (req, res) => {
  const plans = [
    {
      id: 'free',
      name: 'Ücretsiz',
      price: 0,
      currency: 'TRY',
      features: ['Forum erişimi', 'Temel AI asistan (5 soru/gün)', 'Ürün görüntüleme']
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 29.99,
      currency: 'TRY',
      features: ['Gelişmiş AI asistan (50 soru/gün)', 'Ürün satış (5 ürün)', 'Öncelikli destek'],
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 59.99,
      currency: 'TRY',
      features: ['Sınırsız AI asistan', 'Sınırsız ürün satış', '7/24 destek']
    }
  ];
  
  res.json({
    success: true,
    data: plans
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GreenAI Forum API Demo running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: demo`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('  GET  /api                     - API info');
  console.log('  GET  /health                  - Health check');
  console.log('  GET  /api/forum/categories    - Forum categories');
  console.log('  GET  /api/forum/topics        - Forum topics');
  console.log('  GET  /api/forum/search?q=...  - Search topics');
  console.log('  GET  /api/ecommerce/products  - E-commerce products');
  console.log('  GET  /api/ecommerce/categories - Product categories');
  console.log('  GET  /api/ai/status           - AI service status');
  console.log('  GET  /api/membership/plans    - Membership plans');
});
