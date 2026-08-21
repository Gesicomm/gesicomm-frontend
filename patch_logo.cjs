const fs = require('fs');
let code = fs.readFileSync('src/components/UserLayout.jsx', 'utf8');

const targetHTML = `<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
            }}>
              <Store size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                GESICOMM<span className="dot" style={{ color: '#10b981' }}>.</span>
              </h2>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Panel de Usuario
              </span>
            </div>
          </div>`;

const newHTMLAlternative = `<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
            }}>
              <img src="/brand/gesicomm-icono-cuadrado.svg" alt="Gesicomm Icon" style={{ width: '22px', height: '22px', display: 'block' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                GESICOMM<span className="dot" style={{ color: '#10b981' }}>.</span>
              </h2>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Panel de Usuario
              </span>
            </div>
          </div>`;

code = code.replace(targetHTML, newHTMLAlternative);
fs.writeFileSync('src/components/UserLayout.jsx', code);
console.log('patched');
