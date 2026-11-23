# Registro con Hotmart

Alta pública de Gesicom en `gesicomm.com`: portada, `/solicitar-prueba` y
`/crear-cuenta` con el checkout de Hotmart embebido.

## Qué hay acá

| Archivo | Para qué |
|---|---|
| `web/` | Las tres páginas. El `Dockerfile` las copia a `/opt/gesicom-prueba` y `nginx.conf` las sirve solo para `gesicomm.com` / `www.gesicomm.com`. |
| `servidor.py` | Servicio HTTP (puerto 8080, sin dependencias) que atiende `/registro/oferta` y `/registro/cupos`. |
| `cupos.py` | Producto y ofertas de Hotmart: Fundadores (USD 47, primeros 100), Estándar (USD 57). Scaler (USD 77) está en `servidor.py`. |
| `historial.py` | SQLite con las altas confirmadas y las reservas de cupo. |
| `test_*.py` | `python -m pytest -q` desde esta carpeta. |
| `publicar.py` | Script con el que se generó la primera versión de `crear-cuenta.html` a partir de la vista previa. Ya no se usa. |
| `candidato/` | Variante con upsell que se probó y **no está publicada**. |

`/registro/contacto` no pasa por este servicio: nginx lo manda a
`/api/publico/contacto` del backend.

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
  -e GESICOM_HISTORIAL=/datos/altas.sqlite \
  -v ~/gesicomm/gesicomm-frontend/registro:/app:ro \
  -v ~/gesicomm/private/registro:/datos \
  -w /app python:3.13-alpine python servidor.py
```

`~/gesicomm/private/registro/` guarda la credencial de Hotmart (`hotmart.txt`)
y la base de cupos (`altas.sqlite`). **Nunca van al repo.**
