"""Historial durable de Fundadores y asignación transaccional de cupos."""

import sqlite3
from contextlib import closing

from cupos import CUPO, ESTANDAR, FUNDADORES


class Historial:
    def __init__(self, ruta):
        self.ruta = ruta
        with closing(self.conectar()) as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS altas (
                    codigo TEXT PRIMARY KEY
                );
                CREATE TABLE IF NOT EXISTS reservas (
                    registro TEXT PRIMARY KEY
                );
            """)

    def conectar(self):
        return sqlite3.connect(self.ruta, timeout=10, isolation_level=None)

    def reservar(self, registro):
        """Devuelve None si quedan cupos sujetos a una confirmación pendiente."""
        with closing(self.conectar()) as db:
            db.execute("BEGIN IMMEDIATE")
            confirmadas = db.execute("SELECT COUNT(*) FROM altas").fetchone()[0]
            if confirmadas >= CUPO:
                resultado = ESTANDAR
            elif db.execute("SELECT 1 FROM reservas WHERE registro = ?", (registro,)).fetchone():
                resultado = FUNDADORES
            elif confirmadas + db.execute("SELECT COUNT(*) FROM reservas").fetchone()[0] >= CUPO:
                resultado = None
            else:
                db.execute("INSERT INTO reservas VALUES (?)", (registro,))
                resultado = FUNDADORES
            db.commit()
            return resultado

    def confirmar(self, codigo, registro=None):
        with closing(self.conectar()) as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("INSERT OR IGNORE INTO altas VALUES (?)", (codigo,))
            if registro is not None:
                db.execute("DELETE FROM reservas WHERE registro = ?", (registro,))
            db.commit()
