const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Servidor HTTP simple
const PORT = 8080;

const server = http.createServer((req, res) => {
  // Parsear la URL
  let filePath = '.' + (req.url === '/' ? '/silla-ar.html' : req.url);
  
  // Extensiones permitidas
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Archivo no encontrado</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Error del servidor: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📱 Para probar en iOS, usa: http://TU_IP_LOCAL:${PORT}`);
  console.log(`\n⚠️  IMPORTANTE: iOS requiere HTTPS para AR.`);
  console.log(`   Opciones:`);
  console.log(`   1. Usa ngrok: npx ngrok http ${PORT}`);
  console.log(`   2. Usa un túnel: npx localtunnel --port ${PORT}`);
  console.log(`\nPresiona Ctrl+C para detener el servidor\n`);
});
