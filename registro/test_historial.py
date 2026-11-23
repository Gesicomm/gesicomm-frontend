import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Barrier

from cupos import ESTANDAR, FUNDADORES
from historial import Historial


class HistorialTest(unittest.TestCase):
    def test_dos_solicitudes_simultaneas_para_el_ultimo_cupo(self):
        with TemporaryDirectory() as tmp:
            ruta = Path(tmp) / "registro.sqlite"
            historial = Historial(ruta)
            for numero in range(99):
                historial.confirmar(f"simulada-{numero}")

            inicio = Barrier(2)

            def reservar(registro):
                inicio.wait(timeout=5)
                return registro, Historial(ruta).reservar(registro)

            with ThreadPoolExecutor(max_workers=2) as equipo:
                resultados = dict(equipo.map(reservar, ["primera", "segunda"]))
            ganador, = (registro for registro, oferta in resultados.items() if oferta == FUNDADORES)
            espera, = (registro for registro, oferta in resultados.items() if oferta is None)

            self.assertEqual(Historial(ruta).reservar(ganador), FUNDADORES)
            self.assertIsNone(Historial(ruta).reservar(espera))
            historial.confirmar("simulada-99", ganador)
            historial.confirmar("simulada-99", ganador)
            self.assertEqual(Historial(ruta).reservar(espera), ESTANDAR)
