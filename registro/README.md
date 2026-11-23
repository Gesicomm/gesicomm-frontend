# Registro con Hotmart

Alta pública de Gesicom en `gesicomm.com`: portada, `/solicitar-prueba` y
`/crear-cuenta` con el checkout de Hotmart embebido.

## Qué hay acá

| Archivo | Para qué |
|---|---|
| `web/` | Las tres páginas. El `Dockerfile` las copia a `/opt/gesicom-prueba` y `nginx.conf` las sirve solo para `gesicomm.com` / `www.gesicomm.com`. |
| `servidor.py` | Servicio HTTP (puerto 8080, sin dependencias) que atiende `/registro/oferta`: elige la oferta y firma la activación. |
| `cupos.py` | Producto y ofertas de Hotmart: Fundadores (USD 47) mientras queden cupos, después Estándar (USD 57). Scaler (USD 77) está en `servidor.py`. |
| `test_*.py` | `python -m pytest -q` desde esta carpeta. |
| `publicar.py` | Script con el que se generó la primera versión de `crear-cuenta.html` a partir de la vista previa. Ya no se usa. |
| `candidato/` | Variante con upsell que se probó y **no está publicada**. |

`/registro/contacto` y `/registro/cupos` no pasan por este servicio: nginx los
manda al backend (`/api/publico/contacto` y `/api/publico/hotmart/cupos`).

## Cupos de Fundadores

Salen de la base: el total es `planes.cupo_total` del plan `hotmart-starter-founder`
y los usados son las suscripciones de ese plan con al menos un cobro `PAID` en
`pagos_suscripcion` (provider `hotmart`). Los registra el webhook de Hotmart
(`POST /api/webhooks/hotmart`, validado con el parámetro `HOTMART_HOTTOK`).
La prueba gratuita no ocupa cupo; un reembolso o contracargo lo libera.

## Cómo corre en el VPS

No está en el `docker-compose.yml`: es un contenedor aparte en la misma red,
que monta este código en modo solo lectura. Cada deploy del frontend lo
reinicia (`.github/workflows/deploy.yml`).

```sh
cd ~/gesicomm
docker run -d --name gesicom-registro --restart unless-stopped \
  --network gesicomm_default --user 1000:1000 --read-only \
  --cap-drop ALL --security-opt no-new-privileges \
  -e PYTHONDONTWRITEBYTECODE=1 \
  -e HOTMART_CREDENTIAL_FILE=/datos/hotmart.txt \
  -v ~/gesicomm/gesicomm-frontend/registro:/app:ro \
  -v ~/gesicomm/private/registro:/datos \
  -w /app python:3.13-alpine python servidor.py
```

`~/gesicomm/private/registro/` guarda la credencial de Hotmart (`hotmart.txt`).
**Nunca va al repo.** (`altas.sqlite` quedó de la versión anterior y ya no se usa.)
