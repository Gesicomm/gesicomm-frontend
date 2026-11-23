
(() => {
 const form = document.getElementById('activar');
 const campos = ['fn','ln','em','wa','pais'].map(id => document.getElementById(id));
 const pago = document.getElementById('pago');
 const estado = document.getElementById('estado');
 const boton = form.querySelector('button[type=submit]');
 let guardado;
 const dialogo = document.getElementById('oferta-workshop');
 let revision = 0;
 let urlWorkshop;
 function vigilarAlta(email, datos) {
   const actual = ++revision;
   const limite = Date.now() + 15 * 60 * 1000;
   const consultar = async () => {
     if (actual !== revision || Date.now() >= limite) return;
     try {
       const respuesta = await fetch('/registro/oferta', {
         method: 'POST', headers: {'Content-Type':'application/json'},
         body: JSON.stringify({accion:'confirmacion', email, oferta:datos.oferta, desde:datos.desde, firma:datos.firma})
       });
       if (respuesta.ok && (await respuesta.json()).confirmada === true && actual === revision) {
         ++revision;
         pago.hidden = true;
         dialogo.showModal();
         return;
       }
     } catch {}
     if (actual === revision) setTimeout(consultar, 15000);
   };
   setTimeout(consultar, 12000);
 }
 dialogo.addEventListener('close', () => {
   if (dialogo.returnValue !== 'pagar') {
     pago.hidden = false;
     const encabezado = pago.querySelector('h2');
     pago.replaceChildren(encabezado);
     encabezado.textContent = 'Tu prueba de Gesicom ya está activa';
     const enlace = document.createElement('a');
     enlace.href = '/login';
     enlace.textContent = 'Ir a Gesicom';
     pago.append(enlace);
     encabezado.focus();
   }
 });
 document.getElementById('omitir-workshop').addEventListener('click', () => dialogo.close('omitir'));
 document.getElementById('ver-workshop').addEventListener('click', () => {
   dialogo.close('pagar');
   const titulo = document.createElement('h2');
   titulo.id = 'titulo-pago';
   titulo.tabIndex = -1;
   titulo.textContent = 'Workshop de inicio rápido · USD 27';
   const explicacion = document.createElement('p');
   explicacion.textContent = 'Tu prueba de Gesicom sigue activa. Confirmá el pago único del workshop en Hotmart.';
   const marco = document.createElement('iframe');
   marco.title = 'Pago del workshop en Hotmart';
   marco.referrerPolicy = 'no-referrer';
   marco.src = urlWorkshop.toString();
   pago.replaceChildren(titulo, explicacion, marco);
   pago.hidden = false;
   titulo.focus();
 });

 try {
   const datos = JSON.parse(sessionStorage.getItem('gesicom:prueba:preview') || '{}');
   const partes = String(datos.nombre || '').trim().split(/\s+/);
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
     const contacto = [nombre, apellido, email, telefono, pais].join('\n');
     if (guardado !== contacto) {
       const registro = await fetch('https://api.gesicomm.com/api/publico/contacto', {
         method: 'POST', headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({area:'comercial',nombre:nombre+' '+apellido,email,asunto:'Gesicom · Activación de suscripción',mensaje:'País: '+pais+'\nTeléfono: '+telefono})
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
     const cabecera = document.createElement('header');
     const titulo = document.createElement('h2');
     titulo.id = 'titulo-pago';
     titulo.tabIndex = -1;
     titulo.textContent = 'Activá tu suscripción con Hotmart';
     const tarifa = document.createElement('p');
     tarifa.textContent = 'Tres días de prueba. Después, USD ' + datos.mensualidad + ' al mes.';
     const volver = document.createElement('button');
     volver.type = 'button';
     volver.textContent = 'Volver a tus datos';
     const registro = form.closest('.checkout');
     volver.addEventListener('click', () => {
       ++revision;
       pago.hidden = true;
       registro.hidden = false;
       pago.replaceChildren();
       estado.textContent = '';
       boton.focus();
     });
     cabecera.append(titulo, tarifa, volver);
     pago.replaceChildren(cabecera, iframe);
     registro.hidden = true;
     pago.hidden = false;
     document.getElementById('mensualidad').textContent = 'Después de la prueba: USD '+datos.mensualidad+' al mes.';
     estado.textContent = 'Confirmá la activación en Hotmart.';
     pago.scrollIntoView({block:'start'});
     titulo.focus({preventScroll:true});
     urlWorkshop = new URL('https://pay.hotmart.com/I108621857H');
     urlWorkshop.search = new URLSearchParams({checkoutMode:'2',name:nombre+' '+apellido,email}).toString();
     vigilarAlta(email, datos);
   } catch (error) {
     estado.textContent = error.message || 'No se pudo continuar. Volvé a intentar.';
   } finally {
     boton.disabled = false;
   }
 });
})();
