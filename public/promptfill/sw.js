/**
 * Service Worker - 图片缓存
 * 用于缓存模板图片，提升二次加载速度
 */

const CACHE_NAME = 'prompt-fill-images-v1';
const IMAGE_CACHE_NAME = 'prompt-fill-img-cache-v1';

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  '/Logo_icon.svg',
  '/favicon.svg',
  '/manifest.json'
];

// 图片域名白名单（只缓存这些域名的图片）
const IMAGE_DOMAINS = [
  's3.bmp.ovh',           // 模板图片主要存储域名
  'aipromptfill.com',
  'img.freepik.com',
  'images.unsplash.com',
  'cdn.pixabay.com',
  'i.imgur.com',
  'github.com',
  'raw.githubusercontent.com',
];

// 检查是否是图片 URL
function isImage(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/i.test(url) ||
         url.includes('freepik') ||
         url.includes('unsplash') ||
         url.includes('pixabay') ||
         url.includes('imgur');
}

// 检查是否应该缓存该图片
function shouldCacheImage(url) {
  try {
    const urlObj = new URL(url);
    // 缓存本地图片或白名单域名的图片
    if (urlObj.origin === self.location.origin) {
      return true;
    }
    return IMAGE_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

// 安装事件 - 预缓存核心静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME &&
                     cacheName !== IMAGE_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 拦截网络请求 - 缓存图片
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 策略 1: 图片缓存 - Cache First with Network Fallback
  // 优先使用缓存，未命中时才请求网络（适合瀑布流大量图片场景）
  if (isImage(url.href) && shouldCacheImage(url.href)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // 缓存未命中，从网络获取
        return fetch(request)
          .then((response) => {
            // 检查响应是否有效（跨域图片类型为 opaque）
            if (!response || response.status !== 200) {
              // 对于 opaque 响应（跨域），仍然缓存
              if (response && response.type === 'opaque') {
                const responseToCache = response.clone();
                caches.open(IMAGE_CACHE_NAME).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return response;
            }

            // 克隆响应并缓存
            const responseToCache = response.clone();
            caches.open(IMAGE_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch((error) => {
            console.warn('[SW] 图片加载失败:', url.href, error);
            return new Response('Image load failed', { status: 503 });
          });
      })
    );
    return;
  }

  // 策略 2: 静态资源 - Cache First
  // 对于核心静态资源，优先使用缓存
  if (PRECACHE_URLS.some(precacheUrl => url.pathname === precacheUrl)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request);
      })
    );
    return;
  }

  // 策略 3: API 和数据文件 - Network Only
  // 不缓存 API 请求和数据文件（确保获取最新数据）
  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // 其他请求 - 正常通过网络
  event.respondWith(fetch(request));
});

// 消息事件 - 处理来自客户端的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
    event.waitUntil(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.keys().then((keys) => {
          return Promise.all(
            keys.map(request => cache.delete(request))
          );
        });
      })
    );
  }
});
