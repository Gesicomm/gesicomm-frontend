import unittest
from unittest import mock

import servidor
from cupos import ESTANDAR, FUNDADORES, oferta_para


class CuposTest(unittest.TestCase):
    def test_ofertas_mensuales_y_anuales(self):
        self.assertEqual(servidor.resolver_oferta('founder', 'mensual', False), ('0h9kqefg', 47))
        self.assertEqual(servidor.resolver_oferta('founder', 'anual', False), ('2vonlzpl', 470))
        self.assertEqual(servidor.resolver_oferta('starter', 'anual'), ('xjewaydj', 570))
        self.assertEqual(servidor.resolver_oferta('scaler', 'mensual'), ('h7n5ndcy', 77))

    def test_founder_agotado_conserva_el_periodo_elegido(self):
        self.assertEqual(servidor.resolver_oferta('founder', 'anual', True), ('xjewaydj', 570))
        self.assertEqual(servidor.resolver_oferta('founder', 'mensual', True), ('ac3huzol', 57))

    def test_no_inventa_una_oferta_anual_para_scaler(self):
        with self.assertRaises(ValueError):
            servidor.resolver_oferta('scaler', 'anual')
        with self.assertRaises(ValueError):
            servidor.resolver_oferta('starter', 'semanal')

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

    def test_buscar_alta_confirmada_y_activar_en_backend(self):
        desde = 1700000000
        filas = [
            {
                "product": {"id": servidor.PRODUCTO},
                "offer": {"code": FUNDADORES},
                "subscriber": {
                    "email": "Prueba@Example.com",
                    "name": "Martin",
                    "phone": "+595992820631",
                    "address": {"country": "Paraguay"},
                },
                "subscriber_code": "SUB-1",
                "status": "STARTED",
                "trial": True,
                "accession_date": (desde + 10) * 1000,
                "date_next_charge": (desde + 259200) * 1000,
            }
        ]
        fila = servidor.buscar_alta_confirmada(filas, "prueba@example.com", FUNDADORES, desde)
        self.assertIsNotNone(fila)
        self.assertTrue(servidor.alta_confirmada(filas, "prueba@example.com", FUNDADORES, desde))

        with mock.patch.dict("os.environ", {"HOTMART_HOTTOK": "secreto-hottok"}):
            with mock.patch.object(
                servidor,
                "consulta",
                return_value={"activada": True, "tiene_cuenta": False, "token_registro": "tok-abc"},
            ) as consulta:
                res = servidor.activar_en_backend(fila, "prueba@example.com", FUNDADORES)

        self.assertEqual(res.get("token_registro"), "tok-abc")
        self.assertEqual(consulta.call_args.args[1]["X-HOTMART-HOTTOK"], "secreto-hottok")
        self.assertEqual(consulta.call_args.kwargs["cuerpo"]["subscriber_code"], "SUB-1")
        self.assertEqual(consulta.call_args.kwargs["cuerpo"]["pais"], "Paraguay")

        with mock.patch.dict("os.environ", {}, clear=True):
            with mock.patch.object(servidor, "HOTTOK_FILE", "/no/existe/hottok.txt"):
                self.assertEqual(servidor.activar_en_backend(fila, "prueba@example.com", FUNDADORES), {})


if __name__ == "__main__":
    unittest.main()
