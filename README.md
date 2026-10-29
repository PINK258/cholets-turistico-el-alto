# Cholets Turístico El Alto

Plataforma web para descubrir locales, cholets y eventos de la ciudad de El Alto (Bolivia), con tres roles:
**Usuario Turístico**, **Administrador Turístico** (dueño de local) y **Operador G.A.M.E.A.**, y un chatbot con
inteligencia artificial (Qwen2.5-1.5B afinado con *fine-tuning* LoRA + RAG).

| Parte | Tecnología |
|---|---|
| Frontend | Next.js 16, React 18, Tailwind CSS (`frontend/`) |
| Backend | NestJS 10, Prisma 5 (`backend/`) |
| Base de datos | PostgreSQL 17 (`database/`) |
| Chatbot | Ollama + Qwen2.5-1.5B afinado (`finetuning/`) |

---

## Instalación paso a paso (Windows)

### 0. Programas necesarios

Instala estos programas (todos gratuitos), con las opciones por defecto:

| Programa | Versión | Descarga |
|---|---|---|
| Node.js | 20 o superior (LTS) | <https://nodejs.org> |
| PostgreSQL | 17 | <https://www.postgresql.org/download/windows/> (anota la contraseña del usuario `postgres`) |
| Git | cualquiera | <https://git-scm.com/download/win> |
| Ollama (para el chatbot) | cualquiera | <https://ollama.com/download> |

### 1. Descargar el proyecto

```bash
git clone <URL-DEL-REPOSITORIO>
cd <carpeta-del-repositorio>
```

### 2. Crear la base de datos

Abre una terminal **en la carpeta del proyecto** y ejecuta (te pedirá la contraseña de `postgres`):

```bash
"C:\Program Files\PostgreSQL\17\bin\createdb" -U postgres turismo_el_alto
"C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -d turismo_el_alto -f database/estructura.sql
"C:\Program Files\PostgreSQL\17\bin\psql" -U postgres -d turismo_el_alto -f database/datos_iniciales.sql
```

- `estructura.sql`: todas las tablas, relaciones y la auditoría automática.
- `datos_iniciales.sql`: los 14 distritos/zonas de El Alto y las 18 categorías de eventos.

### 3. Backend (API)

```bash
cd backend
copy .env.example .env
```

Abre `backend/.env` y cambia:
- `DATABASE_URL`: pon la contraseña de `postgres`, por ejemplo
  `postgresql://postgres:TU_CONTRASEÑA@localhost:5432/turismo_el_alto?schema=public`
- `JWT_SECRET`: cualquier texto largo.

Después:

```bash
npm install
npx prisma generate
npm run prisma:seed
npm run start:dev
```

Debe quedar escuchando en <http://localhost:3001>. `prisma:seed` crea las cuentas de prueba (ver abajo) y un local de ejemplo.

### 4. Frontend (página web)

En **otra** terminal, desde la carpeta del proyecto:

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Abre <http://localhost:3000> en el navegador.

### 5. Chatbot (Ollama)

Con Ollama instalado y abierto, elige **una** opción:

**A. Modelo afinado del proyecto (recomendado).** Descarga `cholets-qwen.gguf` (~1 GB) desde la sección
**Releases** de este repositorio, cópialo a la carpeta `finetuning/` y ejecuta:

```bash
cd finetuning
ollama create cholets-qwen -f Modelfile
```

En `backend/.env` deja `OLLAMA_MODEL="cholets-qwen"`.

**B. Modelo original sin afinar** (si no puedes descargar el anterior):

```bash
ollama pull qwen2.5:1.5b
```

En `backend/.env` pon `OLLAMA_MODEL="qwen2.5:1.5b"`.

Reinicia el backend después de cambiar el `.env` (Ctrl + C y otra vez `npm run start:dev`).
Sin Ollama la página funciona igual; el chatbot responde solo las preguntas que se contestan con la base de datos.

---

## Cuentas de prueba

Creadas por `npm run prisma:seed`:

| Rol | Correo | Contraseña |
|---|---|---|
| Operador G.A.M.E.A. | `operador@turismoelalto.bo` | `CambiarEstaClave123!` |
| Administrador del sistema | `admin@turismoelalto.bo` | `CambiarEstaClave123!` |
| Administrador Turístico (dueño de ejemplo) | `duenio.iroman@example.com` | `CambiarEstaClave123!` |

Para probar como **Usuario Turístico**, regístrate en la página. Si no configuraste Gmail en el `.env`
(`CORREO_USUARIO` / `CORREO_CLAVE_APP`), el código de verificación aparece en la **terminal del backend**.

---

## Fine-tuning del chatbot

Todo el proceso (dataset, cuaderno de Google Colab, evaluación modelo base vs afinado y resultados) está en
[`finetuning/README.md`](finetuning/README.md).

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `P1001: Can't reach database server` | PostgreSQL no está encendido o la contraseña de `DATABASE_URL` es incorrecta. |
| `npm` no se reconoce | Cierra y abre la terminal después de instalar Node.js. |
| El puerto 3000 o 3001 está ocupado | Cierra la otra terminal donde ya corre el proyecto. |
| El chatbot tarda mucho | La primera pregunta carga el modelo en memoria (10–20 s); las siguientes son rápidas. |
