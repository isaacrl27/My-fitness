"""
Genera el icono de la app (el de la pantalla de inicio del iPhone).

Se hace con Python de serie: ni Pillow ni nada que instalar. Se dibuja una
línea que baja (que es lo que hace la app: bajar de peso) en blanco sobre el
verde de la app, y se escribe el PNG a mano.

Uso:  python scripts/hacer_iconos.py
"""

from __future__ import annotations

import math
import os
import struct
import zlib

# El verde de la app (tiene que coincidir con replica/design/tokens.json).
VERDE = (28, 122, 88)
BLANCO = (255, 255, 255)

# La línea, en coordenadas de 0 a 1 (0,0 es la esquina de arriba a la izquierda).
LINEA = [(0.22, 0.34), (0.42, 0.47), (0.58, 0.37), (0.78, 0.66)]
GROSOR = 0.075
RADIO_PUNTO = 0.085


def distancia_al_segmento(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    largo2 = vx * vx + vy * vy
    t = 0.0 if largo2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / largo2))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def color_en(x, y):
    """Color de un punto, con x e y de 0 a 1."""
    distancia = min(
        distancia_al_segmento(x, y, *LINEA[i], *LINEA[i + 1]) for i in range(len(LINEA) - 1)
    )
    if distancia <= GROSOR / 2:
        return BLANCO
    if math.hypot(x - LINEA[-1][0], y - LINEA[-1][1]) <= RADIO_PUNTO:
        return BLANCO
    return VERDE


def dibujar(lado, muestras=4):
    """Filas de píxeles RGBA, con 4x4 muestras por píxel para que no salga a escalones."""
    filas = []
    total = muestras * muestras
    for py in range(lado):
        fila = bytearray()
        for px in range(lado):
            r = g = b = 0
            for sy in range(muestras):
                for sx in range(muestras):
                    x = (px + (sx + 0.5) / muestras) / lado
                    y = (py + (sy + 0.5) / muestras) / lado
                    c = color_en(x, y)
                    r += c[0]
                    g += c[1]
                    b += c[2]
            fila += bytes((round(r / total), round(g / total), round(b / total), 255))
        filas.append(bytes(fila))
    return filas


def escribir_png(ruta, lado, filas):
    def bloque(tipo, datos):
        return (
            struct.pack(">I", len(datos))
            + tipo
            + datos
            + struct.pack(">I", zlib.crc32(tipo + datos) & 0xFFFFFFFF)
        )

    cabecera = struct.pack(">IIBBBBB", lado, lado, 8, 6, 0, 0, 0)
    crudo = b"".join(b"\x00" + fila for fila in filas)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n")
        fh.write(bloque(b"IHDR", cabecera))
        fh.write(bloque(b"IDAT", zlib.compress(crudo, 9)))
        fh.write(bloque(b"IEND", b""))
    return ruta


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#1c7a58" />
  <path d="M22 34 L42 47 L58 37 L78 66" fill="none" stroke="#ffffff"
        stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="78" cy="66" r="8.5" fill="#ffffff" />
</svg>
"""


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    for lado, destino in [
        (180, "app/apple-icon.png"),
        (192, "public/icono-192.png"),
        (512, "public/icono-512.png"),
    ]:
        ruta = os.path.join(raiz, destino.replace("/", os.sep))
        escribir_png(ruta, lado, dibujar(lado))
        print(f"escrito {destino}  ({lado}x{lado})")

    ruta_svg = os.path.join(raiz, "app", "icon.svg")
    with open(ruta_svg, "w", encoding="utf-8") as fh:
        fh.write(SVG)
    print("escrito app/icon.svg")


if __name__ == "__main__":
    main()
