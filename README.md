# ⚡ KaiExtract — Inteligência Financeira e Auditoria Multi-ERP

Plataforma autônoma para extração, classificação e auditoria visual de despesas condominiais com rastreabilidade total (*Source Grounding*) e integração agnóstica para **SuperLógica**, **CondominIA** e formatos universais (JSON/CSV).

---

## 🚀 Como Executar o Projeto

### 1. Iniciar o Backend (FastAPI):
```bash
cd backend
python3 app.py
```
*O servidor FastAPI estará rodando em `http://localhost:8000`.*

### 2. Iniciar o Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
```
*A interface web estará disponível em `http://localhost:5173`.*

---

## 🧪 Auditoria de Qualidade & Testes em Lote

Para rodar os testes de acurácia com os documentos padrão:
```bash
python3 backend/audit_accuracy.py
```

Para rodar os testes unitários do backend:
```bash
python3 backend/test_backend.py
python3 backend/test_api.py
```

---

## 📦 Estrutura do Repositório

```
KaiExtract/
├── backend/
│   ├── app.py                 # API REST FastAPI (Extract, Visualize, Export, Audit)
│   ├── prompts.py             # System Prompt em inglês e Few-Shot Examples
│   ├── extractor.py           # Core LangExtract / Gemini com Source Grounding
│   ├── normalizer.py          # Adaptadores Multi-ERP (SuperLógica / CondominIA)
│   ├── audit_accuracy.py      # Script de teste em lote da taxa de acerto
│   ├── test_backend.py        # Testes unitários do Core
│   ├── test_api.py            # Testes de integração dos endpoints
│   └── samples/               # Faturas de teste (.txt)
│       ├── cpfl_energia.txt
│       ├── sabesp_agua.txt
│       ├── schindler_elevadores.txt
│       ├── darf_impostos.txt
│       └── portaria_servicos.txt
└── frontend/
    ├── src/
    │   ├── App.jsx            # Orquestrador de fluxo e estados
    │   ├── components/
    │   │   ├── Navbar.jsx           # Header com seletor de ERP e métricas
    │   │   ├── Dropzone.jsx         # Upload Drag & Drop, colagem e 1-clique samples
    │   │   ├── GroundingViewer.jsx  # Visualizador lado a lado com destaques
    │   │   ├── ExtractionForm.jsx   # Formulário interativo e cópia de PIX/Código
    │   │   ├── SuccessModal.jsx     # Confirmação de sincronização ERP
    │   │   └── AuditModal.jsx       # Modal de auditoria em lote (Demo Day)
    │   └── index.css          # Design system minimalista com Glassmorphism
    ├── package.json
    └── vite.config.js
```
