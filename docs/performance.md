# Performance - Sistema de Gestão para Gráficas

## Índice
1. [Visão Geral](#visão-geral)
2. [Métricas](#métricas)
3. [Otimizações](#otimizações)
4. [Monitoramento](#monitoramento)
5. [Caching](#caching)
6. [Lazy Loading](#lazy-loading)
7. [Compressão](#compressão)

## Visão Geral

Este documento descreve as estratégias e práticas de otimização de performance implementadas no Sistema de Gestão para Gráficas.

## Métricas

### 1. Métricas de Carregamento

```javascript
// Monitoramento de performance
const performanceMetrics = {
  // Tempo de carregamento inicial
  firstContentfulPaint: 0,
  // Tempo até interatividade
  timeToInteractive: 0,
  // Tempo de carregamento total
  loadTime: 0,
  // Tamanho total da página
  totalSize: 0
};

// Coleta de métricas
function collectMetrics() {
  const perfData = window.performance.timing;
  
  performanceMetrics.firstContentfulPaint = 
    perfData.domContentLoadedEventEnd - perfData.navigationStart;
    
  performanceMetrics.timeToInteractive = 
    perfData.domComplete - perfData.navigationStart;
    
  performanceMetrics.loadTime = 
    perfData.loadEventEnd - perfData.navigationStart;
    
  // Envia métricas para análise
  sendMetricsToAnalytics(performanceMetrics);
}
```

### 2. Métricas de API

```javascript
// Monitoramento de requisições
const apiMetrics = {
  // Tempo médio de resposta
  averageResponseTime: 0,
  // Taxa de sucesso
  successRate: 0,
  // Erros por endpoint
  errorsByEndpoint: {}
};

// Interceptor de requisições
axios.interceptors.request.use(config => {
  config.metadata = { startTime: new Date() };
  return config;
});

axios.interceptors.response.use(
  response => {
    const duration = new Date() - response.config.metadata.startTime;
    updateApiMetrics(response.config.url, duration, true);
    return response;
  },
  error => {
    const duration = new Date() - error.config.metadata.startTime;
    updateApiMetrics(error.config.url, duration, false);
    throw error;
  }
);
```

## Otimizações

### 1. Otimização de Imagens

```javascript
// Configuração de imagens
const imageConfig = {
  // Tamanhos de thumbnail
  thumbnails: {
    small: { width: 100, height: 100 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 }
  },
  // Formatos suportados
  formats: ['webp', 'jpg', 'png'],
  // Qualidade de compressão
  quality: 80
};

// Função de otimização
async function optimizeImage(file) {
  const image = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Redimensiona para o tamanho desejado
  canvas.width = imageConfig.thumbnails.medium.width;
  canvas.height = imageConfig.thumbnails.medium.height;
  
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  // Converte para WebP
  return canvas.toDataURL('image/webp', imageConfig.quality);
}
```

### 2. Minificação

```javascript
// Configuração do webpack
module.exports = {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      }),
      new CssMinimizerPlugin()
    ]
  }
};
```

### 3. Bundle Splitting

```javascript
// Configuração de code splitting
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/
            )[1];
            return `vendor.${packageName.replace('@', '')}`;
          }
        }
      }
    }
  }
};
```

## Monitoramento

### 1. Firebase Performance

```javascript
// Configuração do Firebase Performance
import { getPerformance } from 'firebase/performance';

const performance = getPerformance(app);

// Monitoramento de traces
const trace = performance.trace('screen_load');
trace.start();

// Após carregamento
trace.stop();
```

### 2. Logs de Performance

```javascript
// Configuração de logs
const performanceLogger = {
  log: (metric) => {
    console.log(`[Performance] ${metric.name}: ${metric.value}ms`);
    
    // Envia para análise
    sendToAnalytics({
      type: 'performance',
      metric: metric.name,
      value: metric.value,
      timestamp: new Date().toISOString()
    });
  }
};

// Uso
performanceLogger.log({
  name: 'screen_load',
  value: 1500
});
```

## Caching

### 1. Cache de Dados

```javascript
// Configuração do cache
const cacheConfig = {
  // Tempo de expiração
  ttl: 5 * 60 * 1000, // 5 minutos
  // Tamanho máximo
  maxSize: 50 * 1024 * 1024 // 50MB
};

// Implementação do cache
class DataCache {
  constructor() {
    this.cache = new Map();
    this.size = 0;
  }

  set(key, value) {
    const item = {
      value,
      timestamp: Date.now()
    };
    
    this.cache.set(key, item);
    this.size += JSON.stringify(value).length;
    
    // Limpa cache se necessário
    this.cleanup();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Verifica expiração
    if (Date.now() - item.timestamp > cacheConfig.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  cleanup() {
    if (this.size > cacheConfig.maxSize) {
      // Remove itens mais antigos
      const sorted = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      while (this.size > cacheConfig.maxSize && sorted.length > 0) {
        const [key] = sorted.shift();
        this.cache.delete(key);
      }
    }
  }
}
```

### 2. Service Worker

```javascript
// Configuração do Service Worker
const CACHE_NAME = 'v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
```

## Lazy Loading

### 1. Componentes

```javascript
// Lazy loading de componentes
const Pedidos = React.lazy(() => import('./pages/Pedidos'));
const Clientes = React.lazy(() => import('./pages/Clientes'));
const Produtos = React.lazy(() => import('./pages/Produtos'));

// Uso
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Route path="/pedidos" component={Pedidos} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/produtos" component={Produtos} />
    </Suspense>
  );
}
```

### 2. Imagens

```javascript
// Lazy loading de imagens
function LazyImage({ src, alt }) {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="lazy-image">
      {!isLoaded && <div className="placeholder" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        style={{ opacity: isLoaded ? 1 : 0 }}
      />
    </div>
  );
}
```

## Compressão

### 1. Gzip

```javascript
// Configuração do Express
const compression = require('compression');

app.use(compression({
  // Nível de compressão
  level: 6,
  // Tamanho mínimo para compressão
  threshold: 1024,
  // Tipos de conteúdo
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### 2. Brotli

```javascript
// Configuração do Nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # Habilita Brotli
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/javascript application/json image/svg+xml;

    # Configuração de cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

## Recomendações

### 1. Frontend
- Use code splitting
- Implemente lazy loading
- Otimize imagens
- Minifique assets
- Utilize CDN

### 2. Backend
- Implemente caching
- Otimize queries
- Use compressão
- Configure rate limiting
- Monitore performance

### 3. Infraestrutura
- Utilize CDN
- Configure cache
- Otimize servidor
- Monitore recursos
- Escale horizontalmente 