import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { UserAuthProvider } from '@/contexts/UserAuthContext';
import { PriceAlertModalProvider } from '@/contexts/PriceAlertModalContext';
import { UserAuthModal } from '@/components/user/UserAuthModal';
import { PriceAlertModal } from '@/components/user/PriceAlertModal';
import { PushNotificationBanner } from '@/components/user/PushNotificationBanner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PromoRadar — As Melhores Promoções e Cupons da Internet',
  description:
    'Agregador de promoções com curadoria e links verificados. Encontre descontos imperdíveis em eletrônicos, celulares, games, eletrodomésticos e muito mais.',
  keywords: ['promoções', 'ofertas', 'desconto', 'cupons', 'black friday', 'amazon', 'mercado livre', 'kabum', 'magalu'],
  openGraph: {
    title: 'PromoRadar — Promoções Verificadas em Tempo Real',
    description: 'Ofertas com desconto real reunidas em um só lugar.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'PromoRadar',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <UserAuthProvider>
            <PriceAlertModalProvider>
              <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-[#0b0f19] dark:text-slate-100">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>

              {/* Modais e Banners Globais de Usuário */}
              <UserAuthModal />
              <PriceAlertModal />
              <PushNotificationBanner />
            </PriceAlertModalProvider>
          </UserAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
