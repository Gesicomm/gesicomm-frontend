"""Selección de oferta y consulta de altas del registro público de Gesicom."""

import base64
import hashlib
import hmac
import time
from contextlib import closing
from threading import Lock
import json
import logging
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from cupos import FUNDADORES, PRODUCTO, oferta_para
from historial import Historial

LOG = logging.getLogger(__name__)
OFERTAS = {"founder": (FUNDADORES, 47), "starter": oferta_para(100), "scaler": ("h7n5ndcy", 77)}
EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")


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


def sincronizar(historial):
    altas = []
    for fila in suscripciones():
        if fila.get("product", {}).get("id") != PRODUCTO:
            raise ValueError("Hotmart devolvió una suscripción de otro producto")
        oferta = fila.get("offer", {}).get("code")
        if not oferta:
            raise ValueError("Hotmart no devolvió el código de oferta")
        estado = fila.get("status")
        if oferta != FUNDADORES or (
            estado != "ACTIVE" and not (estado == "STARTED" and fila.get("trial") is True)
        ):
            continue
        codigo = fila["subscriber_code"]
        email = fila["subscriber"]["email"]
        altas.append((codigo, clave_registro(email)))
    for codigo, registro in altas:
        historial.confirmar(codigo, registro)


def total_fundadores(historial):
    with closing(historial.conectar()) as db:
        return db.execute("SELECT COUNT(*) FROM altas").fetchone()[0]


class Registro(BaseHTTPRequestHandler):
    bloqueo_cupos = Lock()
    ultima_consulta_cupos = None

    def do_GET(self):
        if self.path != "/cupos":
            return self.responder(404, {"error": "Ruta inválida"})
        try:
            with self.bloqueo_cupos:
                total = total_fundadores(self.server.historial)
                ahora = time.monotonic()
                ultima = Registro.ultima_consulta_cupos
                if total < 100 and (ultima is None or ahora - ultima >= 30):
                    Registro.ultima_consulta_cupos = ahora
                    try:
                        sincronizar(self.server.historial)
                    except Exception as exc:
                        LOG.warning("No se pudieron actualizar cupos: %s", type(exc).__name__)
                    total = total_fundadores(self.server.historial)
            return self.responder(200, {"confirmadas": min(total, 100), "agotado": total >= 100})
        except Exception as exc:
            LOG.warning("No se pudieron consultar los cupos: %s", type(exc).__name__)
            return self.responder(503, {"error": "No se pudieron consultar los cupos."})

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
                sincronizar(self.server.historial)
                oferta = self.server.historial.reservar(clave_registro(email))
                if oferta is None:
                    return self.responder(409, {"error": "Hay cupos de Fundadores pendientes de confirmación. Volvé a intentar más tarde."})
                monto = 47 if oferta == FUNDADORES else OFERTAS["starter"][1]
            desde = int(time.time())
            return self.responder(200, {"oferta": oferta, "mensualidad": monto, "desde": desde, "firma": firmar(email, oferta, desde)})
        except Exception as exc:
            LOG.warning("No se pudo resolver la oferta: %s", type(exc).__name__)
            return self.responder(503, {"error": "No pudimos verificar la oferta. Volvé a intentar en unos minutos."})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    servidor = ThreadingHTTPServer(("0.0.0.0", 8080), Registro)
    servidor.historial = Historial(os.environ["GESICOM_HISTORIAL"])
    servidor.serve_forever()
