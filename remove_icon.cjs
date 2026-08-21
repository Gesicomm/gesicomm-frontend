const fs = require('fs');
let code = fs.readFileSync('src/components/UserLayout.jsx', 'utf8');

const regex = /<div style=\{\{\s*width: '32px', height: '32px', borderRadius: '8px',\s*display: 'flex', alignItems: 'center', justifyContent: 'center'\s*\}\}>\s*<img src="\/brand\/gesicomm-icono-cuadrado\.svg"[^>]*>\s*<\/div>/;

code = code.replace(regex, '');

fs.writeFileSync('src/components/UserLayout.jsx', code);
console.log('patched square icon');
