"""Selecciona la oferta de Gesicom a partir de las altas confirmadas por Hotmart."""

from collections.abc import Iterable, Mapping

PRODUCTO = 9031261
FUNDADORES = "0h9kqefg"
ESTANDAR = "ac3huzol"
CUPO = 100


def altas_confirmadas(
    suscripciones: Iterable[Mapping], ya_confirmadas: Iterable[str] = ()
) -> set[str]:
    """Cuenta una vez cada suscripción de Fundadores, incluso durante su prueba."""
    confirmadas = set(ya_confirmadas)
    for fila in suscripciones:
        if fila.get("product", {}).get("id") != PRODUCTO:
            continue
        if fila.get("offer", {}).get("code") != FUNDADORES:
            continue

        estado = fila.get("status")
        en_prueba = fila.get("trial") is True
        if estado != "ACTIVE" and not (estado == "STARTED" and en_prueba):
            continue

        codigo = fila.get("subscriber_code")
        if not codigo:
            raise ValueError("Hotmart devolvió un alta sin identificador")
        confirmadas.add(codigo)

    return confirmadas


def oferta_para(confirmadas: int) -> tuple[str, int]:
    if confirmadas < 0:
        raise ValueError("El número de altas no puede ser negativo")
    return (FUNDADORES, 47) if confirmadas < CUPO else (ESTANDAR, 57)
