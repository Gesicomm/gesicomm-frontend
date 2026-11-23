"""Ofertas de Hotmart del registro de Gesicom."""

PRODUCTO = 9031261
FUNDADORES = "0h9kqefg"
ESTANDAR = "ac3huzol"


def oferta_para(agotado: bool) -> tuple[str, int]:
    """Fundadores mientras queden cupos (los cuenta el backend); después, Estándar."""
    return (ESTANDAR, 57) if agotado else (FUNDADORES, 47)
