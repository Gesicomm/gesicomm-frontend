import unittest
from unittest import mock

import servidor
from cupos import ESTANDAR, FUNDADORES, oferta_para


class CuposTest(unittest.TestCase):
    def test_fundadores_mientras_queden_cupos(self):
        self.assertEqual(oferta_para(False), (FUNDADORES, 47))
        self.assertEqual(oferta_para(True), (ESTANDAR, 57))

    def test_lee_el_estado_del_backend(self):
        respuesta = {"total": 100, "restantes": 0, "agotado": True}
        with mock.patch.object(servidor, "consulta", return_value=respuesta) as consulta:
            self.assertTrue(servidor.fundadores_agotado())
        self.assertEqual(consulta.call_args.args[0], servidor.CUPOS_URL)

    def test_respuesta_invalida_del_backend_falla(self):
        with mock.patch.object(servidor, "consulta", return_value={"error": "x"}):
            with self.assertRaises(ValueError):
                servidor.fundadores_agotado()


if __name__ == "__main__":
    unittest.main()
