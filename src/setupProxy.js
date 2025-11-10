const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/lorcanajson',
    createProxyMiddleware({
      target: 'https://lorcanajson.org',
      changeOrigin: true,
      timeout: 30000, // 30 second timeout (file is 6.4MB)
      proxyTimeout: 30000,
      pathRewrite: {
        '^/api/lorcanajson': '/files/current/en',
      },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader('Origin', 'https://lorcanajson.org');
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
      },
      onProxyRes: (proxyRes) => {
        // Add CORS headers
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      }
    })
  );
};
