"""Selección de oferta y consulta de altas del registro público de Gesicom."""

import base64
import hashlib
import hmac
import time
import json
import logging
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from cupos import FUNDADORES, PRODUCTO, oferta_para

LOG = logging.getLogger(__name__)
OFERTAS = {"founder": (FUNDADORES, 47), "starter": oferta_para(True), "scaler": ("h7n5ndcy", 77)}
EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")
# Los cupos salen de la base del backend (pagos de Hotmart registrados por su webhook).
CUPOS_URL = os.environ.get("GESICOM_CUPOS_URL", "http://gesicomm-back:3000/api/publico/hotmart/cupos")


def consulta(url, encabezados, metodo="GET"):
    with urlopen(Request(url, headers=encabezados, method=metodo), timeout=8) as respuesta:
        return json.load(respuesta)


def suscripciones():
    texto = Path(os.environ["HOTMART_CREDENTIAL_FILE"]).read_text()
    basic = re.search(r"Basic\s+([A-Za-z0-9+/=]+)", texto, re.I)[1]
    cliente, secreto = base64.b64decode(basic).decode().split(":", 1)
    parametros = urlencode({
        "grant_type": "client_credentials",
        "client_id": cliente,
        "client_secret": secreto,
    })
    token = consulta(
        "https://api-sec-vlc.hotmart.com/security/oauth/token?" + parametros,
        {"Authorization": "Basic " + basic, "Content-Type": "application/json"},
        "POST",
    )["access_token"]
    filtros = {"product_id": PRODUCTO, "max_results": 100}
    cursors = set()
    while True:
        datos = consulta(
            "https://developers.hotmart.com/payments/api/v1/subscriptions?" + urlencode(filtros),
            {"Authorization": "Bearer " + token},
        )
        yield from datos["items"]
        cursor = datos["page_info"].get("next_page_token")
        if not cursor:
            return
        if cursor in cursors:
            raise ValueError("Paginación de Hotmart repetida")
        cursors.add(cursor)
        filtros["page_token"] = cursor


def clave_registro(email):
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


def firmar(email, oferta, desde):
    clave = Path(os.environ["HOTMART_CREDENTIAL_FILE"]).read_bytes()
    mensaje = f"{clave_registro(email)}:{oferta}:{desde}".encode()
    return hmac.new(clave, mensaje, hashlib.sha256).hexdigest()


def alta_confirmada(filas, email, oferta, desde):
    for fila in filas:
        suscriptor = fila.get("subscriber") or {}
        if (
            fila.get("product", {}).get("id") == PRODUCTO
            and fila.get("offer", {}).get("code") == oferta
            and str(suscriptor.get("email") or "").strip().lower() == email.strip().lower()
            and fila.get("subscriber_code")
            and fila.get("status") in {"ACTIVE", "STARTED"}
            and (fila.get("status") == "ACTIVE" or fila.get("trial") is True)
        ):
            fecha = fila.get("accession_date")
            if isinstance(fecha, (int, float)) and fecha >= desde * 1000:
                return True
    return False


def fundadores_agotado():
    """True si ya no quedan cupos de Fundadores según el backend."""
    datos = consulta(CUPOS_URL, {"Accept": "application/json"})
    if not isinstance(datos.get("agotado"), bool):
        raise ValueError("El backend no devolvió el estado de los cupos")
    return datos["agotado"]


class Registro(BaseHTTPRequestHandler):
    def do_GET(self):
        return self.responder(404, {"error": "Ruta inválida"})

    def log_message(self, formato, *args):
        return

    def responder(self, status, datos):
        cuerpo = json.dumps(datos).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_POST(self):
        if self.path != "/oferta":
            return self.responder(404, {"error": "Ruta inválida"})
        if self.headers.get("Origin") not in {"https://gesicomm.com", "https://www.gesicomm.com"}:
            return self.responder(403, {"error": "Origen inválido"})
        try:
            largo = int(self.headers.get("Content-Length", 0))
            if not 0 < largo <= 1024:
                raise ValueError
            solicitud = json.loads(self.rfile.read(largo))
            email = solicitud["email"]
            if not isinstance(email, str) or len(email) > 160 or not EMAIL.fullmatch(email):
                raise ValueError
        except (KeyError, TypeError, ValueError):
            return self.responder(400, {"error": "Ingresá un correo válido."})
        try:
            if solicitud.get("accion") == "confirmacion":
                oferta = solicitud.get("oferta")
                desde = solicitud.get("desde")
                firma = solicitud.get("firma")
                if (oferta not in {valor[0] for valor in OFERTAS.values()}
                    or type(desde) is not int or not isinstance(firma, str)
                    or not 0 <= time.time() - desde <= 3600
                    or not hmac.compare_digest(firmar(email, oferta, desde), firma)):
                    return self.responder(403, {"error": "Sesión de activación inválida."})
                confirmada = alta_confirmada(suscripciones(), email, oferta, desde)
                return self.responder(200, {"confirmada": confirmada})
            plan = solicitud.get("plan")
            if plan is not None and (not isinstance(plan, str) or plan not in OFERTAS):
                return self.responder(400, {"error": "El plan seleccionado no está disponible."})
            if plan in {"starter", "scaler"}:
                oferta, monto = OFERTAS[plan]
            else:
                oferta, monto = oferta_para(fundadores_agotado())
            desde = int(time.time())
            return self.responder(200, {"oferta": oferta, "mensualidad": monto, "desde": desde, "firma": firmar(email, oferta, desde)})
        except Exception as exc:
            LOG.warning("No se pudo resolver la oferta: %s", type(exc).__name__)
            return self.responder(503, {"error": "No pudimos verificar la oferta. Volvé a intentar en unos minutos."})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    servidor = ThreadingHTTPServer(("0.0.0.0", 8080), Registro)
    servidor.serve_forever()
