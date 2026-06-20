import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'src/data/cms/homepage.json');

// ---- GET ----
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'products') {
      // Read products from JSON
      const productsPath = path.join(process.cwd(), 'src/data/products.json');
      const productsData = await fs.readFile(productsPath, 'utf-8');
      const products = JSON.parse(productsData);
      return NextResponse.json(products);
    }

    // Homepage data - read from JSON file
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const homepageData = JSON.parse(fileContent);

    return NextResponse.json({
      hero: {
        title: homepageData.hero?.title || '',
        description: homepageData.hero?.description || '',
        collectionLabel: homepageData.hero?.collectionLabel || '',
        buttonLabel: homepageData.hero?.buttonLabel || 'Shop Now',
        ctaUrl: homepageData.hero?.ctaUrl || '/shop',
        image: homepageData.hero?.image || '',
      },
      mission: {
        label: homepageData.mission?.label || '',
        title: homepageData.mission?.title || '',
        description: homepageData.mission?.description || '',
        buttonLabel: homepageData.mission?.buttonLabel || 'Learn More',
        ctaUrl: homepageData.mission?.ctaUrl || '#',
        image: homepageData.mission?.image || '',
      },
      differentiation: {
        label: homepageData.differentiation?.label || '',
        title: homepageData.differentiation?.title || '',
        points: homepageData.differentiation?.points || [],
      },
      featuredProductIds: homepageData.featuredProductIds || [],
    });
  } catch (error) {
    console.error('GET /api/cms/content error:', error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

// ---- POST ----
export async function POST(request: Request) {
  try {
    const { type, data } = await request.json();

    if (type === 'products') {
      // Save products to JSON file
      const productsPath = path.join(process.cwd(), 'src/data/products.json');
      
      // If data is an array, save it directly; if single product, update the array
      let productsToSave = Array.isArray(data) ? data : [data];
      
      if (!Array.isArray(data)) {
        // Single product update - merge with existing
        const existingContent = await fs.readFile(productsPath, 'utf-8');
        const existingProducts = JSON.parse(existingContent);
        productsToSave = existingProducts.map((p: any) => p.id === data.id ? data : p);
      }
      
      await fs.writeFile(productsPath, JSON.stringify(productsToSave, null, 2), 'utf-8');
    } else {
      // Save homepage content to JSON file
      const homepageData = {
        hero: {
          collectionLabel: data.hero?.collectionLabel || 'Collection 2026',
          title: data.hero?.title || '',
          description: data.hero?.description || '',
          buttonLabel: data.hero?.buttonLabel || 'Shop Now',
          ctaUrl: data.hero?.ctaUrl || '/shop',
          image: data.hero?.image || '',
        },
        mission: {
          label: data.mission?.label || '',
          title: data.mission?.title || '',
          description: data.mission?.description || '',
          buttonLabel: data.mission?.buttonLabel || 'Learn More',
          ctaUrl: data.mission?.ctaUrl || '#',
          image: data.mission?.image || '',
        },
        differentiation: {
          label: data.differentiation?.label || '',
          title: data.differentiation?.title || '',
          points: data.differentiation?.points || [],
        },
        featuredProductIds: data.featuredProductIds || [],
      };

      await fs.writeFile(dataFilePath, JSON.stringify(homepageData, null, 2), 'utf-8');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/cms/content error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
