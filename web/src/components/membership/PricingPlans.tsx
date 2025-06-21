'use client';

import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Crown, 
  Zap, 
  Building, 
  Star,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useMembership } from '@/hooks/useMembership';
import { formatPrice } from '@/lib/utils';

interface PricingPlan {
  id: string;
  name: 'free' | 'premium' | 'pro' | 'corporate';
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: Record<string, any>;
  limits: Record<string, number | null>;
  popular?: boolean;
  recommended?: boolean;
}

interface PricingPlansProps {
  plans: PricingPlan[];
  currentPlan?: string;
  onSelectPlan?: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
}

export function PricingPlans({ plans, currentPlan, onSelectPlan }: PricingPlansProps) {
  const [isYearly, setIsYearly] = useState(false);
  const { toast } = useToast();
  const { subscribe, isLoading } = useMembership();

  const planIcons = {
    free: Star,
    premium: Sparkles,
    pro: Crown,
    corporate: Building
  };

  const planColors = {
    free: 'border-gray-200 bg-white',
    premium: 'border-green-200 bg-green-50',
    pro: 'border-blue-200 bg-blue-50',
    corporate: 'border-purple-200 bg-purple-50'
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (plan.name === 'free') {
      toast({
        title: 'Ücretsiz Plan',
        description: 'Zaten ücretsiz planı kullanıyorsunuz.',
      });
      return;
    }

    if (currentPlan === plan.id) {
      toast({
        title: 'Mevcut Plan',
        description: 'Bu planı zaten kullanıyorsunuz.',
      });
      return;
    }

    try {
      await subscribe(plan.id, isYearly ? 'yearly' : 'monthly');
      onSelectPlan?.(plan.id, isYearly ? 'yearly' : 'monthly');
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };

  const getPrice = (plan: PricingPlan) => {
    if (plan.name === 'free') return 0;
    return isYearly ? plan.priceYearly : plan.priceMonthly;
  };

  const getMonthlyPrice = (plan: PricingPlan) => {
    if (plan.name === 'free') return 0;
    return isYearly ? plan.priceYearly / 12 : plan.priceMonthly;
  };

  const getSavings = (plan: PricingPlan) => {
    if (plan.name === 'free') return 0;
    const yearlyMonthly = plan.priceYearly / 12;
    const monthly = plan.priceMonthly;
    return Math.round(((monthly - yearlyMonthly) / monthly) * 100);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Size Uygun Planı Seçin
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          GreenAI Forum'un tüm özelliklerinden yararlanın
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            Aylık
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-green-600"
          />
          <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            Yıllık
          </span>
          {isYearly && (
            <Badge className="bg-green-100 text-green-800 ml-2">
              %17 İndirim
            </Badge>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = planIcons[plan.name];
          const isCurrentPlan = currentPlan === plan.id;
          const price = getPrice(plan);
          const monthlyPrice = getMonthlyPrice(plan);
          const savings = getSavings(plan);

          return (
            <Card 
              key={plan.id}
              className={`relative ${planColors[plan.name]} ${
                plan.popular ? 'ring-2 ring-green-500 scale-105' : ''
              } transition-all duration-300 hover:shadow-lg`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-600 text-white px-4 py-1">
                    En Popüler
                  </Badge>
                </div>
              )}

              {plan.recommended && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    Önerilen
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${
                    plan.name === 'free' ? 'bg-gray-100' :
                    plan.name === 'premium' ? 'bg-green-100' :
                    plan.name === 'pro' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      plan.name === 'free' ? 'text-gray-600' :
                      plan.name === 'premium' ? 'text-green-600' :
                      plan.name === 'pro' ? 'text-blue-600' : 'text-purple-600'
                    }`} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.displayName}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  {plan.description}
                </p>

                <div className="mb-4">
                  {plan.name === 'free' ? (
                    <div className="text-3xl font-bold text-gray-900">
                      Ücretsiz
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-gray-900">
                        {formatPrice(monthlyPrice)}
                        <span className="text-lg font-normal text-gray-600">/ay</span>
                      </div>
                      {isYearly && (
                        <div className="text-sm text-gray-600">
                          {formatPrice(price)} yıllık
                          {savings > 0 && (
                            <span className="text-green-600 font-medium ml-1">
                              (%{savings} tasarruf)
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features List */}
                <div className="space-y-3">
                  {/* Forum Features */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-900">Forum</h4>
                    <FeatureItem 
                      included={plan.features.forum?.unlimitedPosts}
                      text={plan.features.forum?.unlimitedPosts ? "Sınırsız gönderi" : "Günde 5 gönderi"}
                    />
                    <FeatureItem 
                      included={plan.features.forum?.adFree}
                      text="Reklamsız deneyim"
                    />
                    <FeatureItem 
                      included={plan.features.forum?.advancedSearch}
                      text="Gelişmiş arama"
                    />
                  </div>

                  {/* E-commerce Features */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-900">E-Ticaret</h4>
                    <FeatureItem 
                      included={plan.features.ecommerce?.sellerAccount}
                      text={plan.features.ecommerce?.sellerAccount ? 
                        `${plan.limits.productsListed || 'Sınırsız'} ürün` : 
                        "Satıcı hesabı yok"
                      }
                    />
                    <FeatureItem 
                      included={plan.features.ecommerce?.commissionRate < 8}
                      text={`%${plan.features.ecommerce?.commissionRate || 8} komisyon`}
                    />
                  </div>

                  {/* AI Features */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-900">AI Asistan</h4>
                    <FeatureItem 
                      included={true}
                      text={plan.limits.aiQueriesDaily ? 
                        `Günde ${plan.limits.aiQueriesDaily} sorgu` : 
                        "Sınırsız AI sorgusu"
                      }
                    />
                    <FeatureItem 
                      included={plan.features.ai?.priorityResponse}
                      text="Öncelikli yanıt"
                    />
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled
                    >
                      Mevcut Planınız
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.popular ? 'bg-green-600 hover:bg-green-700' :
                        plan.name === 'pro' ? 'bg-blue-600 hover:bg-blue-700' :
                        plan.name === 'corporate' ? 'bg-purple-600 hover:bg-purple-700' :
                        ''
                      }`}
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isLoading}
                    >
                      {plan.name === 'free' ? 'Ücretsiz Başla' : 'Planı Seç'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center mt-12">
        <p className="text-sm text-gray-600 mb-4">
          Tüm planlar 14 gün ücretsiz deneme ile gelir. İstediğiniz zaman iptal edebilirsiniz.
        </p>
        <div className="flex justify-center gap-6 text-sm text-gray-500">
          <span>✓ 7/24 Müşteri Desteği</span>
          <span>✓ Güvenli Ödeme</span>
          <span>✓ İptal Garantisi</span>
        </div>
      </div>
    </div>
  );
}

// Feature Item Component
function FeatureItem({ included, text }: { included: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {included ? (
        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
      ) : (
        <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      <span className={`text-sm ${included ? 'text-gray-900' : 'text-gray-500'}`}>
        {text}
      </span>
    </div>
  );
}

// Plan Comparison Table Component
export function PlanComparisonTable({ plans }: { plans: PricingPlan[] }) {
  const features = [
    { key: 'forum.unlimitedPosts', label: 'Sınırsız Forum Gönderisi' },
    { key: 'forum.adFree', label: 'Reklamsız Deneyim' },
    { key: 'forum.advancedSearch', label: 'Gelişmiş Arama' },
    { key: 'forum.prioritySupport', label: 'Öncelikli Destek' },
    { key: 'ecommerce.sellerAccount', label: 'Satıcı Hesabı' },
    { key: 'ecommerce.commissionRate', label: 'Komisyon Oranı' },
    { key: 'ai.dailyQueries', label: 'Günlük AI Sorgusu' },
    { key: 'ai.priorityResponse', label: 'Öncelikli AI Yanıtı' },
    { key: 'ai.advancedModel', label: 'Gelişmiş AI Modeli' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-4 border-b">Özellik</th>
            {plans.map(plan => (
              <th key={plan.id} className="text-center p-4 border-b">
                {plan.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map(feature => (
            <tr key={feature.key} className="border-b">
              <td className="p-4 font-medium">{feature.label}</td>
              {plans.map(plan => {
                const value = getNestedValue(plan.features, feature.key);
                return (
                  <td key={plan.id} className="text-center p-4">
                    {typeof value === 'boolean' ? (
                      value ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : 
                              <X className="w-5 h-5 text-gray-400 mx-auto" />
                    ) : (
                      <span>{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
