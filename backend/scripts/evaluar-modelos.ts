// Compara el modelo base con el afinado (fine-tuning) usando las preguntas de
// ../finetuning/dataset/evaluacion.jsonl, que el modelo NO vio al entrenar.
//
//   cd backend
//   npm run modelo:evaluar                          (qwen2.5:1.5b vs cholets-qwen)
//   npm run modelo:evaluar -- qwen2.5:1.5b otro     (otros nombres de modelo)
//
// Para cada respuesta mide:
//   - aciertos: si contiene los datos esperados (direccion, capacidad, nombres...);
//   - tiempo de respuesta (RNF02: < 5 s).
// Escribe una tabla en ../finetuning/resultados/ (Markdown y CSV) para la tesis.
// Ollama debe estar encendido y los dos modelos instalados (ollama list).
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const OLLAMA = process.env.OLLAMA_URL || 'http://localhost:11434';
const [modeloBase = 'qwen2.5:1.5b', modeloAfinado = 'cholets-qwen'] = process.argv.slice(2);
// Limite de preguntas para que la prueba no tarde demasiado en una PC sin GPU.
const MAXIMO = Number(process.env.EVAL_MAXIMO) || 60;

type Caso = { tipo: string; system: string; pregunta: string; claves: string[] };
type Resultado = { tipo: string; acierto: number; ms: number };

const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\*\*/g, '');

async function preguntar(modelo: string, c: Caso) {
  const inicio = Date.now();
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      stream: false,
      keep_alive: '1h',
      // Mismos parametros que la pagina (chatbot.service.ts).
      options: { temperature: 0.2, num_predict: 220 },
      messages: [
        { role: 'system', content: c.system },
        { role: 'user', content: c.pregunta },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${modelo}: Ollama respondió ${res.status} (¿está instalado? ollama list)`);
  const data = await res.json();
  return { texto: String(data?.message?.content ?? ''), ms: Date.now() - inicio };
}

// Fraccion de datos esperados que aparecen en la respuesta (0 a 1). Se buscan
// como palabras completas: "si" no debe contar dentro de "asi" o "sin".
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const puntaje = (texto: string, claves: string[]) =>
  claves.filter((k) => new RegExp(`(^|[^a-z0-9])${escapar(normalizar(k))}($|[^a-z0-9])`).test(normalizar(texto))).length /
  claves.length;

function resumir(resultados: Resultado[]) {
  const porTipo: Record<string, Resultado[]> = {};
  for (const r of resultados) (porTipo[r.tipo] ??= []).push(r);
  const prom = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
  return {
    total: { acierto: prom(resultados.map((r) => r.acierto)), ms: prom(resultados.map((r) => r.ms)), n: resultados.length },
    porTipo: Object.fromEntries(
      Object.entries(porTipo).map(([t, xs]) => [t, { acierto: prom(xs.map((x) => x.acierto)), ms: prom(xs.map((x) => x.ms)), n: xs.length }]),
    ),
  };
}

async function main() {
  if (modeloBase === modeloAfinado) throw new Error('Indica dos modelos distintos (base y afinado).');
  const carpeta = join(__dirname, '..', '..', 'finetuning');
  const casos: Caso[] = readFileSync(join(carpeta, 'dataset', 'evaluacion.jsonl'), 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .slice(0, MAXIMO);

  const resultados: Record<string, Resultado[]> = { [modeloBase]: [], [modeloAfinado]: [] };
  const ejemplos: string[] = [];
  for (const [i, c] of casos.entries()) {
    for (const modelo of [modeloBase, modeloAfinado]) {
      const { texto, ms } = await preguntar(modelo, c);
      const acierto = puntaje(texto, c.claves);
      resultados[modelo].push({ tipo: c.tipo, acierto, ms });
      if (i < 8) ejemplos.push(`**${modelo}** · ${c.pregunta}\n> ${texto.replace(/\n/g, '\n> ')}\n`);
    }
    process.stdout.write(`\r${i + 1}/${casos.length} preguntas`);
  }
  console.log('');

  const base = resumir(resultados[modeloBase]);
  const afinado = resumir(resultados[modeloAfinado]);
  const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
  const seg = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
  const tipos = [...new Set(casos.map((c) => c.tipo))];

  const md = [
    `# Evaluación: ${modeloBase} vs ${modeloAfinado}`,
    '',
    `Fecha: ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })} · ${casos.length} preguntas de validación (no usadas en el entrenamiento).`,
    '',
    '| Tipo de pregunta | N | Aciertos base | Aciertos afinado | Tiempo base | Tiempo afinado |',
    '|---|---|---|---|---|---|',
    ...tipos.map((t) => {
      const b = base.porTipo[t];
      const a = afinado.porTipo[t];
      return `| ${t} | ${b.n} | ${pct(b.acierto)} | ${pct(a.acierto)} | ${seg(b.ms)} | ${seg(a.ms)} |`;
    }),
    `| **Total** | ${base.total.n} | **${pct(base.total.acierto)}** | **${pct(afinado.total.acierto)}** | ${seg(base.total.ms)} | ${seg(afinado.total.ms)} |`,
    '',
    '"Aciertos" = porcentaje de datos esperados (dirección, capacidad, nombres de locales, rechazo de preguntas ajenas...) presentes en la respuesta.',
    '',
    '## Ejemplos de respuestas',
    '',
    ...ejemplos,
  ].join('\n');

  const csv = [
    'modelo,tipo,n,aciertos,tiempo_ms',
    ...[
      [modeloBase, base],
      [modeloAfinado, afinado],
    ].flatMap(([m, r]: any) => [
      ...Object.entries(r.porTipo).map(([t, x]: any) => `${m},${t},${x.n},${x.acierto.toFixed(4)},${Math.round(x.ms)}`),
      `${m},total,${r.total.n},${r.total.acierto.toFixed(4)},${Math.round(r.total.ms)}`,
    ]),
  ].join('\n');

  const salida = join(carpeta, 'resultados');
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, 'evaluacion.md'), md, 'utf-8');
  writeFileSync(join(salida, 'evaluacion.csv'), csv, 'utf-8');
  console.log(`Aciertos: ${modeloBase} ${pct(base.total.acierto)} · ${modeloAfinado} ${pct(afinado.total.acierto)}`);
  console.log(`Tiempo medio: ${seg(base.total.ms)} · ${seg(afinado.total.ms)}`);
  console.log(`Resultados en ${salida}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
