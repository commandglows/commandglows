export const prerender = true;

import type { APIRoute } from "astro";
import sharp from "sharp";
import path from 'path';

export const getStaticPaths = () => {
  return [
    { params: { lang: 'fr' } },
    { params: { lang: 'en' } },
  ];
};

export const GET: APIRoute = async () => {
  try {
    const sourcePath = path.resolve(process.cwd(), 'public/images/CommandGlows.png');
    const faviconBuffer = await sharp(sourcePath)
      .resize(32, 32)
      .png()
      .toBuffer();

    return new Response(new Uint8Array(faviconBuffer), {
      headers: {
        'Content-Type': 'image/x-icon'
      }
    });
  } catch (error) {
    console.error('Error generating favicon:', error);
    return new Response('Error generating favicon', { status: 500 });
  }
};
