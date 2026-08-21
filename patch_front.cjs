const fs = require('fs');
let code = fs.readFileSync('src/pages/vitrina/VitrinaGrid.jsx', 'utf8');

code = code.replace(
  /const \[filtroCategoria, setFiltroCategoria\] = useState\(''\);/,
  "const [filtroCategoria, setFiltroCategoria] = useState('');\n  const [filtroProveedor, setFiltroProveedor] = useState('');"
);

code = code.replace(
  /const \[categoriasUnicas, setCategoriasUnicas\] = useState\(\[\]\);/,
  "const [categoriasUnicas, setCategoriasUnicas] = useState([]);\n  const [proveedoresUnicos, setProveedoresUnicos] = useState([]);"
);

code = code.replace(
  /const data = await vitrinaService\.catalogoPaginado\(\{[\s\S]*?\}\);/,
  "const data = await vitrinaService.catalogoPaginado({\n        page, limit: 10, busqueda, filtroCategoria, filtroProveedor, orden, tipo: filtro\n      });"
);

code = code.replace(
  /setCategoriasUnicas\(data\.categorias \|\| \[\]\);/,
  "setCategoriasUnicas(data.categorias || []);\n      setProveedoresUnicos(data.proveedores || []);"
);

code = code.replace(
  /\]\), \[page, busqueda, filtroCategoria, orden, filtro\]\);/g,
  "]), [page, busqueda, filtroCategoria, filtroProveedor, orden, filtro]);"
);

code = code.replace(
  /\} \), \[busqueda, filtroCategoria, orden, filtro\]\);/g,
  "} ), [busqueda, filtroCategoria, filtroProveedor, orden, filtro]);"
);

const provFilterJSX = `
        {/* Filtro de proveedor */}
        {proveedoresUnicos.length > 0 && (
          <select
            className="vit-sort-select"
            value={filtroProveedor}
            onChange={(e) => setFiltroProveedor(e.target.value)}
            title="Filtrar por proveedor"
          >
            <option value="">Todos los proveedores</option>
            {proveedoresUnicos.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        )}
`;

code = code.replace(
  /\{\/\* Selector de orden \*\/\}/,
  provFilterJSX.trim() + "\n\n        {/* Selector de orden */}"
);

fs.writeFileSync('src/pages/vitrina/VitrinaGrid.jsx', code);
console.log('patched frontend');
