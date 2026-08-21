#!/bin/bash

# Cores para o terminal macOS para melhor visualização
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sem cor (No Color)

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}        ESTEIRA DE TESTES AUTOMATIZADA: KAIEXTRACT (SELECT)       ${NC}"
echo -e "${BLUE}=================================================================${NC}\n"

# 1. Verifica se o Python 3 está instalado
echo -e "${YELLOW}[1/4] Verificando ambiente Python e dependências...${NC}"
if ! command -v python3 &> /dev/null
then
    echo -e "${RED}Erro: Python 3 não está instalado ou não foi encontrado no PATH.${NC}"
    exit 1
fi

# Instala dependências a partir do requirements.txt se ele existir localmente
if [ -f "requirements.txt" ]; then
    echo -e "Instalando dependências do 'requirements.txt'..."
    python3 -m pip install -r requirements.txt --quiet
    echo -e "${GREEN}Dependências verificadas/instaladas com sucesso.${NC}"
else
    echo -e "${YELLOW}Aviso: 'requirements.txt' não encontrado. Certifique-se de que a biblioteca 'requests' esteja instalada.${NC}"
fi

# 2. Executa o Gerador de Testes
echo -e "\n${YELLOW}[2/4] Executando o gerador de faturas (.txt) de teste...${NC}"
if [ -f "gerador_testes_chunking.py" ]; then
    python3 gerador_testes_chunking.py
    echo -e "${GREEN}Massa de teste gerada com sucesso nas coordenadas exatas.${NC}"
else
    echo -e "${RED}Erro crítico: 'gerador_testes_chunking.py' não foi encontrado na pasta atual.${NC}"
    exit 1
fi

# 3. Define a URL da API do backend do KaiExtract
# Se o usuário passar um argumento (ex: ./run_tests.sh http://api.com), usa esse argumento.
# Caso contrário, assume o localhost padrão.
API_URL=${1:-"http://localhost:8000/api/extract"}
echo -e "\n${YELLOW}[3/4] Configurando destino de validação de API...${NC}"
echo -e "Alvo da requisição: ${GREEN}${API_URL}${NC}"

# 4. Executa o Validador de Integração
echo -e "\n${YELLOW}[4/4] Disparando o validador de conformidade e integridade...${NC}"
if [ -f "validador_api_chunking.py" ]; then
    python3 validador_api_chunking.py "$API_URL"
else
    echo -e "${RED}Erro crítico: 'validador_api_chunking.py' não foi encontrado na pasta atual.${NC}"
    exit 1
fi

echo -e "\n${BLUE}=================================================================${NC}"
echo -e "${BLUE}          PROCESSO DE HOMOLOGAÇÃO KAIEXTRACT CONCLUÍDO            ${NC}"
echo -e "${BLUE}=================================================================${NC}"
