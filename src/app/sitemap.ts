import { MetadataRoute } from 'next';
import { getOffers, getCategories, getStores } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elitedaspechinchas.com.br';

  // Rotas estáticas principais
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/favoritos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/alertas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  try {
    // Categorias
    const categories = await getCategories();
    for (const cat of categories) {
      routes.push({
        url: `${baseUrl}/categoria/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.8,
      });
    }

    // Lojas
    const stores = await getStores();
    for (const store of stores) {
      routes.push({
        url: `${baseUrl}/loja/${store.slug}`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.8,
      });
    }

    // Ofertas
    const offersRes = await getOffers({ limit: 100 });
    for (const offer of offersRes.items) {
      routes.push({
        url: `${baseUrl}/oferta/${offer.id}`,
        lastModified: offer.published_at ? new Date(offer.published_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });
    }
  } catch {
    // Mantém rotas estáticas em caso de falha de conexão
  }

  return routes;
}
