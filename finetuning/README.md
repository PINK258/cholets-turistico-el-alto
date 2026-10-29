# Fine-tuning del chatbot (Qwen2.5-1.5B + LoRA)

El chatbot usa un modelo **afinado** (fine-tuning) a partir de **Qwen2.5-1.5B-Instruct**, combinado con
**RAG** (los datos de los locales se leen de PostgreSQL en cada pregunta).

- El **fine-tuning** enseña al modelo el estilo, las reglas (no inventar, decir "no tengo esa información",
  rechazar temas ajenos) y las preguntas frecuentes de la plataforma y de El Alto.
- El **RAG** le da los datos que cambian todos los días (locales nuevos, eventos, reseñas), que no se pueden
  "memorizar" en un entrenamiento.

## Archivos

| Archivo | Para qué |
|---|---|
| `dataset/cholets_train.jsonl` | Ejemplos de entrenamiento (90 %) |
| `dataset/cholets_val.jsonl` | Ejemplos de validación (10 %) |
| `dataset/evaluacion.jsonl` | Preguntas de prueba con los datos esperados |
| `entrenar_cholets_qwen.ipynb` | Cuaderno de Google Colab que entrena el modelo |
| `Modelfile` | Instala el modelo afinado en Ollama |
| `resultados/` | Tabla comparativa modelo base vs afinado (se crea al evaluar) |

Scripts del backend: `backend/scripts/generar-dataset.ts` y `backend/scripts/evaluar-modelos.ts`.

## Paso a paso

### 1. Generar el dataset (en tu PC)
Con PostgreSQL encendido, en una terminal de VS Code:
```bash
cd CODIGO/backend
npm run dataset:generar
```
Vuelve a ejecutarlo si agregas locales o cambias los textos de `src/chatbot/conocimiento.ts`.

### 2. Entrenar en Google Colab (gratis, ~1 hora)
Tu tarjeta gráfica (AMD RX 570) no sirve para entrenar: las herramientas necesitan una GPU NVIDIA. Colab
presta una gratis.
1. Entra a <https://colab.research.google.com> con tu cuenta de Google.
2. **Archivo → Subir cuaderno** → elige `entrenar_cholets_qwen.ipynb`.
3. **Entorno de ejecución → Cambiar tipo de entorno de ejecución → GPU T4** → Guardar.
4. Ejecuta las celdas en orden (▶). En la celda 2 sube `cholets_train.jsonl` y `cholets_val.jsonl`.
5. Al final se descargan **`cholets-qwen.gguf`** (~1 GB) y **`curva_perdida.png`** (gráfico para la tesis).

### 3. Instalar el modelo en Ollama (en tu PC)
Copia `cholets-qwen.gguf` a esta carpeta (`CODIGO/finetuning/`) y ejecuta aquí:
```bash
ollama create cholets-qwen -f Modelfile
```
Comprueba con `ollama list` que aparece `cholets-qwen`.

### 4. Usarlo en la página
En `CODIGO/backend/.env` cambia:
```
OLLAMA_MODEL="cholets-qwen"
```
y reinicia el backend (el `.env` solo se lee al arrancar). Para volver al modelo original, pon otra vez
`qwen2.5:1.5b`.

### 5. Comparar base vs afinado (resultados para la tesis)
```bash
cd CODIGO/backend
npm run modelo:evaluar
```
Crea `resultados/evaluacion.md` y `resultados/evaluacion.csv` con el porcentaje de aciertos y el tiempo de
respuesta de cada modelo, por tipo de pregunta. Tarda unos minutos (60 preguntas × 2 modelos); cierra
programas pesados (juegos) para que los tiempos sean representativos.

## Datos para el capítulo de la tesis

| Parámetro | Valor |
|---|---|
| Modelo base | Qwen2.5-1.5B-Instruct (Alibaba, licencia Apache 2.0) |
| Técnica | LoRA (Low-Rank Adaptation) con cuantización a 4 bits (QLoRA), librería Unsloth |
| Rango LoRA (r) / alpha | 16 / 16 |
| Módulos adaptados | q, k, v, o, gate, up, down (atención y MLP) |
| Épocas | 2 |
| Tasa de aprendizaje | 2e-4, programación lineal, 10 pasos de calentamiento |
| Lote efectivo | 8 (2 × acumulación 4) |
| Longitud máxima | 2048 tokens |
| Pérdida | Solo sobre las respuestas del asistente (`train_on_responses_only`) |
| Dataset | 1282 conversaciones: 1154 entrenamiento / 128 validación |
| Tipos de ejemplo | Ficha de local (RAG), listas por zona/evento, preguntas frecuentes (con y sin contexto), rechazo de temas ajenos |
| Hardware de entrenamiento | Google Colab, GPU NVIDIA T4 (16 GB) |
| Formato de despliegue | GGUF q4_k_m en Ollama (CPU local) |

**Por qué fine-tuning + RAG:** el fine-tuning por sí solo no sirve para datos que cambian (un local
registrado hoy no estaría en el modelo), y un modelo pequeño sin ajuste tiende a inventar. Al combinarlos,
el modelo afinado sigue mejor las reglas y responde con los datos actuales que le entrega la base de datos.
