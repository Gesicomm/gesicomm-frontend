"""Prepara el HTML institucional y su configuración de Nginx para el registro."""

import re
import sys
from pathlib import Path

base = Path(sys.argv[1])
destino = Path(sys.argv[2])
html = (base / "private/prueba-web/publicado/crear-cuenta.html").read_text()
html = re.sub(r'<section class="pay-box bump">.*?</section>', "", html, count=1, flags=re.S)
html = html.replace('<p class="terms">Estos datos solo se muestran en la vista previa de esta pestaña.</p>', "")
html = html.replace('<h2 tabindex="-1">', '<form id="activar"><h2 tabindex="-1">', 1)
for identificador, limite in {"fn": 75, "ln": 74, "em": 160, "wa": 40}.items():
    html = html.replace(f'id="{identificador}"', f'id="{identificador}" required maxlength="{limite}"', 1)
html = html.replace('<input list="paises"', '<input id="pais" required maxlength="80" list="paises"', 1)
html = html.replace('El método de pago se habilitará cuando se conecte Hotmart. Esta vista previa no solicita datos de tarjeta.', 'Ingresá tu medio de pago en Hotmart. La suscripción comienza con tres días de prueba.')
html = html.replace('<button type="button" disabled>Activación aún no disponible</button><p class="terms">Vista previa. La activación y el pago se habilitarán al conectar Hotmart.</p>', '<button type="submit">Continuar a la activación</button><p class="terms" id="estado" role="status"></p></form>', 1)
html = html.replace('<p id="bump-line" hidden>Workshop · USD 27 (pago único)</p>', '<p id="mensualidad" aria-live="polite">La tarifa se confirma al continuar.</p>')
html = html.replace('Total ilustrativo', 'Suscripción durante la prueba')
html = html.replace('Resumen de ejemplo. Elegir el workshop no hace ningún cargo.', 'Al terminar la prueba empieza la mensualidad de la oferta que confirmes en Hotmart.')
html = html.replace('</aside></section></section></main>', '</aside></section><section id="pago" hidden></section></section></main>', 1)
html, cambios = re.subn(r'<script>.*?</script>', """
<style>#pago iframe{display:block;width:100%;min-height:70vh;border:0}#pago[hidden]{display:none}</style>
<script>
(() => {
 const form = document.getElementById('activar');
 const campos = ['fn','ln','em','wa','pais'].map(id => document.getElementById(id));
 const pago = document.getElementById('pago');
 const estado = document.getElementById('estado');
 const boton = form.querySelector('button[type=submit]');
 let guardado;
 try {
   const datos = JSON.parse(sessionStorage.getItem('gesicom:prueba:preview') || '{}');
   const partes = String(datos.nombre || '').trim().split(/\\s+/);
   const valores = [partes.shift(), partes.join(' '), datos.correo, datos.telefono, datos.pais];
   campos.forEach((campo, i) => { campo.value = valores[i] || ''; });
 } catch {}
 form.addEventListener('submit', async event => {
   event.preventDefault();
   if (boton.disabled) return;
   const [nombre, apellido, email, telefono, pais] = campos.map(campo => campo.value.trim());
   if ([nombre, apellido, email, telefono, pais].some(value => !value)) {
     estado.textContent = 'Completá todos los campos.';
     return;
   }
   boton.disabled = true;
   estado.textContent = 'Guardando tus datos y verificando la oferta…';
   try {
     const contacto = [nombre, apellido, email, telefono, pais].join('\\n');
     if (guardado !== contacto) {
       const registro = await fetch('https://api.gesicomm.com/api/publico/contacto', {
         method: 'POST', headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({area:'comercial',nombre:nombre+' '+apellido,email,asunto:'Gesicom · Activación de suscripción',mensaje:'País: '+pais+'\\nTeléfono: '+telefono})
       });
       if (!registro.ok || !(await registro.json()).mensaje?.id) throw Error('No se confirmaron tus datos.');
       guardado = contacto;
     }
     const respuesta = await fetch('/registro/oferta', {
       method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email})
     });
     const datos = await respuesta.json();
     if (!respuesta.ok) throw Error(datos.error || 'No se pudo verificar la oferta.');
     const ofertas = {'0h9kqefg':47, 'ac3huzol':57};
     if (ofertas[datos.oferta] !== datos.mensualidad || !datos.mensualidad) throw Error('No se pudo confirmar el precio.');
     const url = new URL('https://pay.hotmart.com/D108595206C');
     url.search = new URLSearchParams({off:datos.oferta,checkoutMode:'2',name:nombre+' '+apellido,email}).toString();
     const iframe = document.createElement('iframe');
     iframe.title = 'Activación de Gesicom en Hotmart';
     iframe.referrerPolicy = 'no-referrer';
     iframe.src = url;
     pago.replaceChildren(iframe);
     pago.hidden = false;
     document.getElementById('mensualidad').textContent = 'Después de la prueba: USD '+datos.mensualidad+' al mes.';
     estado.textContent = 'Confirmá la activación en Hotmart.';
     pago.scrollIntoView({block:'start'});
     iframe.focus();
   } catch (error) {
     estado.textContent = error.message || 'No se pudo continuar. Volvé a intentar.';
   } finally {
     boton.disabled = false;
   }
 });
})();
</script>
""".replace("\\", "\\\\"), html, count=1, flags=re.S)
assert cambios == 1 and 'add-workshop' not in html and 'id="pago"' in html
(destino / "crear-cuenta.html").write_text(html)
nginx = (base / "deploy/prueba-web/nginx.conf").read_text()
match = re.search(r"    location \^~ /__gesicom_preview/ \{.*?\n    \}", nginx, re.S)
seccion = match[0].replace("location ^~ /__gesicom_preview/", "location = /__gesicom_preview/crear-cuenta.html")
seccion = seccion.replace("alias /opt/gesicom-prueba/;", "alias /opt/gesicom-prueba/crear-cuenta.html;")
seccion = seccion.replace("connect-src 'none';", "connect-src 'self' https://api.gesicomm.com; frame-src https://pay.hotmart.com;")
proxy = """    location = /registro/oferta {
        client_max_body_size 1k;
        resolver 127.0.0.11 valid=30s ipv6=off;
        set $registro_backend http://gesicom-registro:8080;
        proxy_pass $registro_backend/oferta;
        proxy_read_timeout 25s;
    }

"""
(destino / "nginx.conf").write_text(nginx[:match.start()] + proxy + seccion + "\n\n" + nginx[match.start():])
