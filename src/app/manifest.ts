import type { MetadataRoute } from 'next';

/** Lets people install LifeSphere from the browser ("Add to Home screen") and share files into it. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'LifeSphere',
    short_name: 'LifeSphere',
    description: 'Your day, your family, your neighbourhood — on your terms.',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f6f8',
    theme_color: '#0d5c58',
    categories: ['lifestyle', 'productivity', 'health'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Get help', url: '/help?source=shortcut', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Tasks', url: '/tasks?source=shortcut', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Check-ins', url: '/check-ins?source=shortcut', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Smart inbox', url: '/inbox?source=shortcut', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
    // Android: "Share" a photo, PDF or message from any app → it lands in the Smart inbox.
    share_target: {
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [{ name: 'files', accept: ['application/pdf', 'image/*', 'text/plain', 'text/csv', '.docx', '.xlsx', '.pptx', '.md'] }],
      },
    },
  } as MetadataRoute.Manifest;
}
