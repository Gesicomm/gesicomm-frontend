import unittest

from cupos import ESTANDAR, FUNDADORES, PRODUCTO, altas_confirmadas, oferta_para


def alta(numero, estado="ACTIVE", prueba=True, oferta=FUNDADORES, producto=PRODUCTO):
    return {
        "subscriber_code": f"simulada-{numero}",
        "product": {"id": producto},
        "offer": {"code": oferta},
        "status": estado,
        "trial": prueba,
    }


class CuposTest(unittest.TestCase):
    def test_cambio_entre_alta_100_y_101(self):
        filas = [alta(i) for i in range(100)]
        self.assertEqual(oferta_para(len(altas_confirmadas(filas[:99]))), (FUNDADORES, 47))
        self.assertEqual(oferta_para(len(altas_confirmadas(filas))), (ESTANDAR, 57))

    def test_deduplica_y_excluye_otras_ofertas(self):
        filas = [
            alta(1), alta(1, prueba=False), alta(2, oferta=ESTANDAR),
            alta(3, producto=9047224), alta(4, estado="INACTIVE"),
        ]
        self.assertEqual(altas_confirmadas(filas), {"simulada-1"})

    def test_distingue_inicio_en_prueba(self):
        self.assertEqual(altas_confirmadas([alta(1, "STARTED"), alta(2, "STARTED", False)]), {"simulada-1"})

    def test_baja_posterior_no_reabre_cupo(self):
        inicial = altas_confirmadas([alta(i) for i in range(100)])
        despues = altas_confirmadas([alta(99, "CANCELLED")], inicial)
        self.assertEqual(oferta_para(len(despues)), (ESTANDAR, 57))

    def test_alta_sin_id_falla(self):
        fila = alta(1)
        del fila["subscriber_code"]
        with self.assertRaises(ValueError):
            altas_confirmadas([fila])


if __name__ == "__main__":
    unittest.main()
