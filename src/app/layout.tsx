import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import { UserAuthProvider } from '@/contexts/UserAuthContext';
import { PriceAlertModalProvider } from '@/contexts/PriceAlertModalContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Code-split heavy modals and floating widgets so they don't block critical page load JS
const UserAuthModal = dynamic(
  () => import('@/components/user/UserAuthModal').then((mod) => mod.UserAuthModal),
  { ssr: false }
);
const PriceAlertModal = dynamic(
  () => import('@/components/user/PriceAlertModal').then((mod) => mod.PriceAlertModal),
  { ssr: false }
);
const PushNotificationBanner = dynamic(
  () => import('@/components/user/PushNotificationBanner').then((mod) => mod.PushNotificationBanner),
  { ssr: false }
);
const ScrollToTop = dynamic(() => import('@/components/ScrollToTop'), { ssr: false });

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Elite das Pechinchas — As Melhores Promoções e Cupons da Internet',
  description:
    'Agregador de promoções com curadoria e links verificados. Encontre descontos imperdíveis em eletrônicos, celulares, games, eletrodomésticos e muito mais.',
  keywords: ['promoções', 'ofertas', 'desconto', 'cupons', 'black friday', 'amazon', 'mercado livre', 'kabum', 'magalu', 'pechinchas'],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Elite das Pechinchas — Promoções Verificadas em Tempo Real',
    description: 'Ofertas com desconto real reunidas em um só lugar.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Elite das Pechinchas',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC Theme Script: executes synchronously before render */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('elitedaspechinchas_theme')||localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <UserAuthProvider>
            <PriceAlertModalProvider>
              <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-[#0b0f19] dark:text-slate-100">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>

              {/* Modais e Banners Globais de Usuário (Carregados Sob Demanda) */}
              <UserAuthModal />
              <PriceAlertModal />
              <PushNotificationBanner />
              <ScrollToTop />
            </PriceAlertModalProvider>
          </UserAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
