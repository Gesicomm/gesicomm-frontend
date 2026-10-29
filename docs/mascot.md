# Mascota de Gesicom

Las cuatro imágenes originales del usuario están en `public/brand/mascot/`.
Se conservan sin retoques. Una superficie clara y `mix-blend-mode: multiply`
integran su fondo blanco con la escena.

`src/components/public/GesicomMascot.jsx` comparte la presentación entre la
landing institucional y el acceso. La landing recorre tres pasos automáticamente;
el login usa `pose`, `message` y `note` según foco, carga, errores, verificación
y confirmación. El componente nunca recibe contraseñas ni valores de campos,
ni realiza solicitudes. Las notas de la landing son una demostración visual.

El personaje cambia de pose cada 4,5 segundos y repite el recorrido sin clics.
El movimiento es continuo, el texto aparece en 1,2 segundos y el trazo se dibuja
en 1,8 segundos. Los indicadores de pasos no son botones. El login también
anima las poses automáticamente mientras espera, pero los estados reales de
carga, error, verificación y éxito tienen prioridad sobre el ciclo decorativo.
El botón de pausa detiene tanto el ciclo como los efectos, también en móvil.
`prefers-reduced-motion` desactiva el avance automático y el movimiento.
El intervalo se limpia al desmontar y no avanza con la pestaña oculta.

Para verificar con el servidor Vite abierto en el puerto 5179:

```sh
node scripts/qa-mascot.mjs
```

Se puede configurar otro origen con `MASCOT_QA_URL`. Usar `localhost` para la
landing institucional: el enrutador interpreta `127.0.0.1` como una tienda.
El script simula todas las respuestas API; no crea cuentas ni envía correos.
Comprueba estados, teclado, pausa, imágenes, movimiento reducido y tamaños de
320, 390 y 1440 px, además del tema oscuro y ampliación CSS al 200 %. Guarda
capturas e informe en `../outputs/mascota-gesicom/`.

## Actualización: guía flotante del login

El acceso usa ahora LoginCompanion.jsx, separado de la escena de la landing.
La mascota transparente se desplaza junto a correo, contraseña y registro cada
5,5 segundos. El foco y la escritura la mantienen junto al campo durante 10
segundos; los estados de carga, error, OTP y éxito tienen prioridad. No lee
valores ni mueve el foco. En móvil permanece arriba durante el scroll.

Recurso: public/brand/mascot/guia-transparente.png, generado con image_gen
integrado desde alerta.png. Prompt aplicado: conservar la silueta, carcasa,
rostro, ojos verdes y logo de la mascota original; quitar únicamente fondo
blanco, suelo, sombra y rayos decorativos; entregar el bolígrafo completo sobre
alfa transparente, sin texto ni marco. Los originales se conservan intactos.

Verificación adicional: node scripts/qa-login-companion.mjs.
