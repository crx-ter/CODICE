# CÓDICE — Sistema de Estudio con IA

App nativa Android (Capacitor + PWA) para estudio inteligente con agentes de IA.

## 🧠 Agentes IA disponibles

| Agente | Alias | Modelo | Especialidad |
|--------|-------|--------|-------------|
| El Cerebro | `@cerebro` | Nemotron 120B | Razonamiento profundo, síntesis |
| El Ingeniero | `@ingeniero` | Qwen3-Coder | Código, algoritmos, debugging |
| El Ojo | *(automático)* | Nemotron VL | Imágenes, OCR, diagramas |
| El Velocista | `@velocista` | DeepSeek Flash | Respuestas rápidas |
| El Documentador | `@documentador` | Llama 3.3 70B | Cursos completos, divisiones |
| El Esteta | `@esteta` | Gemma 4 31B | Prosa elegante, narrativa |
| El Tutor | `@tutor` | Llama 3.3 70B | Pedagogía socrática |
| El Examinador | `@examinador` | Trinity Thinking | Exámenes de práctica |
| El Planner | `@planner` | Qwen3 80B MoE | Horarios, planes de estudio |
| Códice Personal | `@personal` | Gemma 4 31B | Conversación, apoyo, charla |

## 📦 Build APK

El build se hace automáticamente en GitHub Actions al hacer push a `main`.

**Requisitos del workflow:**
- Java 17 (Temurin)
- Node 22
- Android SDK (auto-instalado)
- Capacitor 6.1.2

**Pasos para descargar el APK:**
1. Ve a `Actions` → último workflow
2. Haz clic en el artefacto `Codice-YYYYMMDD-XXXXX`
3. Descarga y transfiere a tu Android

## 🚀 Deploy rápido

```powershell
# Descomprimir y pushear
Expand-Archive -Path codice-fixed.zip -DestinationPath C:\Users\elcri\Downloads\
cd C:\Users\elcri\Downloads\codice-fixed
git init
git remote add origin https://github.com/crx-ter/CODICE.git
git add -A
git commit -m "feat: mejoras v6 — agente personal + prompts mejorados"
git branch -M main
git push -f origin main
```

## 🔥 Firebase

- Auth: Google + Email
- Firestore: módulos, progreso, horarios
- Hosting: `codice-4d18f.web.app`
