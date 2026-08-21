const fs = require('fs');
let code = fs.readFileSync('src/components/UserLayout.jsx', 'utf8');

code = code.replace(
  /<h2 style=\{\{\s*margin: 0, display: 'flex', alignItems: 'center'\s*\}\}>\s*<img src="\/brand\/gesicomm-horizontal\.svg"[^>]*>\s*<\/h2>/,
  `<h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                GESICOMM<span className="dot" style={{ color: '#10b981' }}>.</span>
              </h2>`
);

fs.writeFileSync('src/components/UserLayout.jsx', code);
console.log('patched');
