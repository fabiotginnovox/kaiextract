# Manual de Homologação de Testes: Chunking Inteligente e Rastreabilidade
**Projeto:** KaiExtract (SELECT / SuperLógica)  
**Objetivo:** Instruções técnicas para execução, validação e interpretação da esteira de testes automatizados do processamento em blocos (*Chunking Inteligente*) e precisão de coordenadas (*Source Grounding*).

---

## 1. Visão Geral dos Testes

O processamento de faturas e contas de consumo longas em formato de texto desestruturado (TXT) exige uma estratégia robusta de divisão de dados para evitar o estouro de limites de contexto e a perda de informações cruciais localizadas nas quebras de página [1, 2, 5]. 

Esta esteira de testes foi projetada para homologar três frentes críticas de segurança do backend desenvolvido pela equipe de engenharia (Antigravity) [3]:
1. **Integridade de Margem (Overlap):** Garantia de que dados nas fronteiras dos blocos de fatiamento não sejam corrompidos.
2. **Remapeamento de Coordenadas Globais (Global Grounding):** Validação matemática de que os índices `char_interval` retornados no JSON correspondem à posição original e total do documento no TXT [8].
3. **Deduplicação Inteligente:** Remoção automática de extrações redundantes identificadas nas faixas de sobreposição.

---

## 2. Estrutura do Kit de Testes

Os arquivos devem estar organizados na pasta de testes do seu repositório local:

```text
kaiextract/
└── tests/
    ├── requirements.txt             # Dependências necessárias (requests)
    ├── gerador_testes_chunking.py   # Gerador de faturas sintéticas calibradas
    ├── validador_api_chunking.py    # Validador de integração HTTP e inspeção de JSON
    └── run_tests.sh                 # Script de automação e orquestração para macOS
```

---

## 3. Preparação e Instalação

Abra o Terminal do seu macOS, navegue até o diretório do projeto e configure o ambiente com os comandos abaixo:

```bash
# Navegar até a pasta de testes
cd kaiextract/tests

# Instalar dependências externas
pip install -r requirements.txt

# Dar permissão de execução ao script de automação (necessário apenas uma vez)
chmod +x run_tests.sh
```

---

## 4. Executando a Esteira de Testes Completa

Para rodar o ciclo completo de testes (geração dos arquivos, disparos de requisições HTTP para a API e validação de regras de negócio), execute o script de automação passando a URL da API do KaiExtract como parâmetro:

### Se o backend estiver rodando localmente (porta padrão 8000):
```bash
./run_tests.sh
```

### Se o backend estiver rodando em outra porta ou ambiente de homologação:
```bash
./run_tests.sh http://localhost:5000/api/v1/extract
```

---

## 5. Cenários Testados e Interpretação de Resultados

A esteira executa três cenários rigorosos. Veja abaixo o que cada um valida e como interpretar as falhas no relatório final do Terminal:

### Cenário 1: Teste de Overlap na Fronteira (Fatura de Transição)
*   **O que faz:** Envia um documento onde a linha digitável do boleto está posicionada exatamente na divisória física do bloco de 5.000 caracteres.
*   **O que o teste valida:** O backend deve ser capaz de capturar e extrair a linha digitável de forma 100% íntegra utilizando a faixa de sobreposição de 800 caracteres.
*   **Se FALHAR:** O algoritmo de *overlap* do backend não está coletando os caracteres de transição ou o bloco foi cortado bruscamente.

### Cenário 2: Teste de Offset Global (Rastreabilidade Multipáginas)
*   **O que faz:** Envia um documento longo (equivalente a 3 páginas) onde o "Valor Total" está localizado após 8.800 caracteres do início do texto.
*   **O que o teste valida:** O JSON retornado pela API do backend deve marcar a coordenada `char_interval` global do campo de forma exata (ex: `[8880, 8919]`) [8].
*   **Se FALHAR:** O backend está retornando índices relativos ao pedaço isolado (chunk) processado (ex: `[20, 59]`). **Isso quebrará o realce visual (highlight) do documento no lado esquerdo da tela do KaiExtract!**

### Cenário 3: Teste de Deduplicação no Overlap
*   **O que faz:** Posiciona os dados do Fornecedor e CNPJ exatamente no intervalo de caracteres processado por ambos os blocos simultaneamente.
*   **O que o teste valida:** Confirma se o backend identificou a duplicata na zona de transição e unificou o registro, retornando apenas uma entidade limpa no JSON estruturado.
*   **Se FALHAR:** A resposta JSON retornará dados duplicados para o mesmo campo, sujando o card de dados estruturados à direita da tela [10].

---

## 6. Integração Contínua (Boas Práticas)

*   **Validação de Alterações:** Este script deve ser executado pelo desenvolvedor **antes de qualquer commit ou pull request** no backend.
*   **Calibração de Prompts:** Caso a taxa de acerto do modelo caia ou novos modelos de extração sejam adotados, utilize essa suite para garantir que a quebra de contexto continua íntegra e segura [12].
