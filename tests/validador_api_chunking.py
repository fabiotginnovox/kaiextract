import requests
import json
import sys

# Configuração do Endpoint do Backend do Antigravity
# Altere para a URL real do seu ambiente de desenvolvimento/homologação
API_URL = "http://localhost:8000/api/extract"

# Dados Esperados Baseados nos Cenários do gerador_testes_chunking.py
EXPECTED_SCENARIOS = {
    "cenario_1": {
        "file_name": "fatura_teste_cenario1_fronteira.txt",
        "description": "Teste de Overlap na Fronteira do Chunk (Boleto longo)",
        "expected_field": "codigo_barras",
        "expected_value": "40390.00007 15561.761817 74578.909017 1 1503000008375"
    },
    "cenario_2": {
        "file_name": "fatura_teste_cenario2_global.txt",
        "description": "Teste de Remapeamento de Coordenadas Globais (Global Offset)",
        "expected_field": "valor_total",
        "expected_value": "3.420,15",
        "expected_interval": [8880, 8919]
    },
    "cenario_3": {
        "file_name": "fatura_teste_cenario3_deduplicacao.txt",
        "description": "Teste de Deduplicação de Overlap (Zona Comum)",
        "expected_field": "fornecedor",
        "expected_value": "SECOVI PE - SIND EMP C VEND L ADM",
        "max_occurrences": 1
    }
}

def rodar_teste_cenario(key, config):
    print(f"\n==================================================")
    print(f"🧪 Executando: {config['description']}")
    print(f"==================================================")
    
    file_path = config["file_name"]
    if not os.path.exists(file_path):
        print(f"❌ Erro: O arquivo '{file_path}' não foi encontrado.")
        print("   Certifique-se de rodar primeiro o 'gerador_testes_chunking.py'.")
        return False

    # 1. Leitura do arquivo TXT gerado
    with open(file_path, "r", encoding="utf-8") as f:
        texto_conteudo = f.read()

    # 2. Envio da requisição para o backend do Antigravity
    payload = {
        "texto": texto_conteudo,
        "config_chunk_size": 5000,
        "config_overlap": 800
    }
    
    try:
        print(f"➡️ Enviando requisição POST para {API_URL}...")
        response = requests.post(API_URL, json=payload, timeout=10)
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de Conexão: Não foi possível se comunicar com o backend em {API_URL}.")
        print(f"   Detalhe: {e}")
        return False

    if response.status_code != 200:
        print(f"❌ Erro no Servidor: Código HTTP {response.status_code} retornado.")
        print(f"   Resposta: {response.text}")
        return False

    data = response.json()
    extracoes = data.get("dados_extraidos", [])
    
    # 3. Execução das Validações
    sucesso = True
    
    if key == "cenario_1":
        # Valida se a linha digitável foi extraída sem truncar
        encontrado = False
        for ext in extracoes:
            attrs = ext.get("atributos", {})
            if attrs.get(config["expected_field"]) == config["expected_value"]:
                encontrado = True
                print(f"✅ SUCESSO: Linha digitável extraída perfeitamente cruzando a fronteira de 5000 caracteres!")
                break
        if not encontrado:
            print(f"❌ FALHA: Código de barras esperado '{config['expected_value']}' não foi encontrado.")
            sucesso = False

    elif key == "cenario_2":
        # Valida se a coordenada do intervalo é global (offset absoluto) e não relativa
        encontrado = False
        for ext in extracoes:
            attrs = ext.get("atributos", {})
            if attrs.get(config["expected_field"]) == config["expected_value"]:
                encontrado = True
                intervalo_retornado = ext.get("intervalo")
                expected_interval = config["expected_interval"]
                
                print(f"ℹ️ Dado extraído: {config['expected_value']}")
                print(f"ℹ️ Coordenada retornada: {intervalo_retornado}")
                print(f"ℹ️ Coordenada esperada: {expected_interval}")
                
                if intervalo_retornado == expected_interval:
                    print(f"✅ SUCESSO: O backend calculou o offset global corretamente!")
                else:
                    print(f"❌ FALHA: O backend retornou intervalo relativo ao chunk. Rastreabilidade Visual quebrada.")
                    sucesso = False
                break
        if not encontrado:
            print(f"❌ FALHA: Valor esperado '{config['expected_value']}' não foi encontrado na extração.")
            sucesso = False

    elif key == "cenario_3":
        # Valida se houve deduplicação de elementos no overlap
        ocorrencias = 0
        for ext in extracoes:
            attrs = ext.get("atributos", {})
            if config["expected_value"] in str(attrs.get(config["expected_field"], "")):
                ocorrencias += 1
        
        print(f"ℹ️ Ocorrências detectadas do fornecedor: {ocorrencias}")
        if ocorrencias == config["max_occurrences"]:
            print(f"✅ SUCESSO: Algoritmo de deduplicação unificou os registros da faixa de overlap!")
        elif ocorrencias > config["max_occurrences"]:
            print(f"❌ FALHA: Duplicidade detectada! O backend retornou o mesmo fornecedor {ocorrencias} vezes.")
            sucesso = False
        else:
            print(f"❌ FALHA: O fornecedor esperado '{config['expected_value']}' não foi extraído.")
            sucesso = False

    return sucesso

if __name__ == "__main__":
    import os
    
    print("=================================================================")
    print("VALIDADOR DE BACKEND: CONFORMIDADE DE CHUNKING E RASTREABILIDADE")
    print("=================================================================")
    
    if len(sys.argv) > 1:
        API_URL = sys.argv[1]
        
    print(f"Configurado para testar endpoint: {API_URL}")
    print("Para alterar a URL de teste, execute: python validador_api_chunking.py http://sua-url-backend/api")
    
    resultados = []
    for key, config in EXPECTED_SCENARIOS.items():
        res = rodar_teste_cenario(key, config)
        resultados.append(res)
        
    print("\n==================================================")
    print("📋 RESUMO FINAL DA VALIDAÇÃO:")
    print("==================================================")
    for (key, config), res in zip(EXPECTED_SCENARIOS.items(), resultados):
        status = "🟢 PASSOU" if res else "🔴 FALHOU"
        print(f" - {config['description']}: {status}")
    
    if all(resultados):
        print("\n🎉 PARABÉNS! O backend do Antigravity está 100% em conformidade com as especificações do LangExtract!")
    else:
        print("\n⚠️ ALERTA: Há ajustes pendentes de conformidade no backend para garantir a usabilidade da SELECT.")
