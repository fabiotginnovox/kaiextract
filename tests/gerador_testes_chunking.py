import os

# Definições teóricas adotadas na especificação técnica (v2)
CHUNK_SIZE = 5000  # Tamanho de cada bloco
OVERLAP = 800      # Zona de sobreposição

def criar_cenario_1_fronteira():
    """
    CENÁRIO 1: Teste de Overlap na Fronteira do Chunk
    Objetivo: Inserir a linha digitável exatamente na divisão do Bloco 1 (char 5000).
    A sobreposição de 800 caracteres deve garantir que o dado seja lido de forma 
    completa no segundo bloco, sem corte ou perda de contexto.
    """
    nome_arquivo = "fatura_teste_cenario1_fronteira.txt"
    
    # Criamos exatamente 4940 caracteres de preenchimento ('A')
    # O dado de teste crítico iniciará no caractere 4940, cruzando a barreira de 5000
    filler_inicio = "A " * 2470 
    dado_critico = "\nLINHA DIGITAVEL DO BOLETO: 40390.00007 15561.761817 74578.909017 1 1503000008375\n"
    filler_fim = "B " * 500
    
    conteudo = filler_inicio + dado_critico + filler_fim
    
    with open(nome_arquivo, "w", encoding="utf-8") as f:
        f.write(conteudo)
        
    inicio_real = len(filler_inicio)
    fim_real = inicio_real + len(dado_critico)
    
    print(f"✅ Arquivo '{nome_arquivo}' gerado com sucesso!")
    print(f"   -> Linha Digitável posicionada nos índices exatos: [{inicio_real} : {fim_real}]")
    print(f"   -> O backend DEVE extrair a linha digitável completa usando o overlap.\n")


def criar_cenario_2_offset_global():
    """
    CENÁRIO 2: Teste de Remapeamento de Coordenadas Globais (Global Offset)
    Objetivo: Garantir que dados que estejam muito distantes no arquivo (ex: página 3)
    tenham suas coordenadas de caractere recalculadas para a posição global do TXT.
    """
    nome_arquivo = "fatura_teste_cenario2_global.txt"
    
    # Simula um documento longo com múltiplas páginas e dados de preenchimento
    pagina_1 = "SELECT CONDOMINIOS - RELATORIO PARTE 1\n" + ("X " * 2200) + "\n"  # ~4400 chars
    pagina_2 = "SELECT CONDOMINIOS - RELATORIO PARTE 2\n" + ("Y " * 2200) + "\n"  # ~4400 chars
    
    # Dado crítico inserido bem adiante no documento (índice ~8800+)
    dado_critico = "\nVALOR TOTAL DESTE BOLETO: R$ 3.420,15\n"
    pagina_3 = "SELECT CONDOMINIOS - RELATORIO PARTE 3\n" + ("Z " * 500)
    
    conteudo = pagina_1 + pagina_2 + dado_critico + pagina_3
    
    with open(nome_arquivo, "w", encoding="utf-8") as f:
        f.write(conteudo)
        
    inicio_real = len(pagina_1 + pagina_2)
    fim_real = inicio_real + len(dado_critico)
    
    print(f"✅ Arquivo '{nome_arquivo}' gerado com sucesso!")
    print(f"   -> Campo 'Valor Total' posicionado nos índices globais: [{inicio_real} : {fim_real}]")
    print(f"   -> O backend DEVE retornar o char_interval exato de ({inicio_real}, {fim_real}) no JSON final.\n")


def criar_cenario_3_deduplicacao():
    """
    CENÁRIO 3: Teste de Deduplicação de Overlap
    Objetivo: Colocar um dado completo exatamente dentro da faixa de sobreposição 
    do Bloco 1 com o Bloco 2 (ex: caractere 4500). O motor lerá essa informação 
    duas vezes. O backend precisa limpar e consolidar em uma extração única.
    """
    nome_arquivo = "fatura_teste_cenario3_deduplicacao.txt"
    
    # Dado posicionado no caractere 4500 (dentro da faixa 4200 a 5000 que sofre overlap)
    filler_inicio = "W " * 2250 
    dado_sobreposto = "\nFORNECEDOR: SECOVI PE - SIND EMP C VEND L ADM\n"
    filler_fim = "K " * 1000
    
    conteudo = filler_inicio + dado_sobreposto + filler_fim
    
    with open(nome_arquivo, "w", encoding="utf-8") as f:
        f.write(conteudo)
        
    inicio_real = len(filler_inicio)
    fim_real = inicio_real + len(dado_sobreposto)
    
    print(f"✅ Arquivo '{nome_arquivo}' gerado com sucesso!")
    print(f"   -> Campo 'Fornecedor' no overlap global: [{inicio_real} : {fim_real}]")
    print(f"   -> O backend DEVE remover a duplicata e retornar apenas 1 ocorrência do Fornecedor.\n")


if __name__ == "__main__":
    print("=================================================================")
    print("GERADOR DE CENÁRIOS DE TESTE: CHUNKING & GROUNDING (KAIEXTRACT)")
    print("=================================================================\n")
    criar_cenario_1_fronteira()
    criar_cenario_2_offset_global()
    criar_cenario_3_deduplicacao()
    print("Instruções: Envie os arquivos gerados para a API do KaiExtract")
    print("e compare as coordenadas do JSON com as métricas indicadas acima!")
