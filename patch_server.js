const fs = require('fs');
const file = 'server/server.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('express.static')) {
  // Find where app.use(cors()) is
  const insertIndex = content.indexOf('app.use(express.json());') + 'app.use(express.json());'.length;
  
  const staticSetup = `
const path = require('path');
// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));
`;
  
  content = content.slice(0, insertIndex) + staticSetup + content.slice(insertIndex);
  
  // Find app.listen
  const listenIndex = content.indexOf('app.listen(PORT,');
  const fallbackRoute = `
// SPA fallback route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

`;
  
  content = content.slice(0, listenIndex) + fallbackRoute + content.slice(listenIndex);
  
  fs.writeFileSync(file, content);
  console.log('Patched server.js');
}
