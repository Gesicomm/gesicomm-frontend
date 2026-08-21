const fs = require('fs');
let code = fs.readFileSync('src/components/UserLayout.jsx', 'utf8');

code = code.replace(
  /<div style=\{\{\s*width: '32px', height: '32px', borderRadius: '8px',\s*background: 'linear-gradient\(135deg, #10b981, #059669\)',\s*display: 'flex', alignItems: 'center', justifyContent: 'center',\s*color: '#fff', boxShadow: '0 4px 10px rgba\(16, 185, 129, 0\.25\)'\s*\}\}>\s*<Store size=\{16\} \/>\s*<\/div>/,
  `<div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img src="/brand/gesicomm-icono-cuadrado.svg" alt="Gesicomm Icon" style={{ width: '32px', height: '32px', display: 'block' }} />
            </div>`
);

code = code.replace(
  /<h2 style=\{\{\s*fontSize: '1rem', fontWeight: 800, letterSpacing: '-0\.02em', margin: 0\s*\}\}>\s*GESICOMM<span className="dot" style=\{\{\s*color: '#10b981'\s*\}\}>\.<\/span>\s*<\/h2>/,
  `<h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <img src="/brand/gesicomm-horizontal.svg" alt="Gesicomm" style={{ height: '18px', display: 'block', marginTop: '2px' }} />
              </h2>`
);

fs.writeFileSync('src/components/UserLayout.jsx', code);
console.log('patched');
