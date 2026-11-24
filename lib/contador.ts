/**
 * Lógica pura de descomposición y formateo para contadores rodantes (Rare UI / Odometer).
 *
 * Descompone cualquier número en columnas de dígitos animados y caracteres estáticos,
 * asignando claves estables por posición (unidades, decenas, decimales) para que React
 * preserve cada columna en el DOM sin saltos visuales ni desmontajes al cambiar de cifra.
 */

export type ElementoContador =
  | { clave: string; tipo: "digito"; valor: number; retrasoMs: number }
  | { clave: string; tipo: "simbolo"; caracter: string };

export function descomponerNumero(
  valor: number,
  formateador?: (n: number) => string
): { texto: string; elementos: ElementoContador[] } {
  // Manejo de valores no finitos
  if (!Number.isFinite(valor)) {
    return {
      texto: "0",
      elementos: [{ clave: "ent-0", tipo: "digito", valor: 0, retrasoMs: 0 }],
    };
  }

  const texto = formateador ? formateador(valor) : valor.toLocaleString("es-ES");

  const sepIdx = texto.indexOf(",");
  const tieneDecimal = sepIdx !== -1;
  const parteEntera = tieneDecimal ? texto.slice(0, sepIdx) : texto;
  const parteDecimal = tieneDecimal ? texto.slice(sepIdx + 1) : "";

  const elementos: ElementoContador[] = [];

  const digitosEnterosTotales = (parteEntera.match(/[0-9]/g) || []).length;
  let cuentaDigitosEnteros = 0;

  for (let i = 0; i < parteEntera.length; i++) {
    const char = parteEntera[i];
    if (char >= "0" && char <= "9") {
      const posDesdeDer = Math.max(0, digitosEnterosTotales - 1 - cuentaDigitosEnteros);
      elementos.push({
        clave: `ent-${posDesdeDer}`,
        tipo: "digito",
        valor: parseInt(char, 10),
        retrasoMs: Math.min(150, cuentaDigitosEnteros * 25),
      });
      cuentaDigitosEnteros++;
    } else {
      elementos.push({
        clave: `sym-ent-${i}`,
        tipo: "simbolo",
        caracter: char,
      });
    }
  }

  if (tieneDecimal) {
    elementos.push({
      clave: "sym-coma",
      tipo: "simbolo",
      caracter: ",",
    });

    let cuentaDigitosDec = 0;
    for (let i = 0; i < parteDecimal.length; i++) {
      const char = parteDecimal[i];
      if (char >= "0" && char <= "9") {
        elementos.push({
          clave: `dec-${cuentaDigitosDec}`,
          tipo: "digito",
          valor: parseInt(char, 10),
          retrasoMs: Math.min(150, (digitosEnterosTotales + 1 + cuentaDigitosDec) * 25),
        });
        cuentaDigitosDec++;
      } else {
        elementos.push({
          clave: `sym-dec-${i}`,
          tipo: "simbolo",
          caracter: char,
        });
      }
    }
  }

  return { texto, elementos };
}
