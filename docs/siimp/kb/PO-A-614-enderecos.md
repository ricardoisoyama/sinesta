# Endereços

- ID: PO-A-614
- Caminho: 🛟 BASE DE CONHECIMENTO > PESSOAS > Endereços
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-614
- Anexos (não baixados): 00_banner_enderecos.png; e01_form_mapa.png; e02_preenchido_mapa.png; e03_grid.png; 99_rodape.png

---

![Manual - Pessoas - Endereços](00_banner_enderecos.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Muitos clientes e parceiros operam em mais de um endereço: filiais, centros de distribuição, locais de coleta ou de entrega. A aba **ENDEREÇOS** guarda esses locais adicionais, além do endereço principal informado na aba **PRINCIPAL**.

Cada endereço tem um **TIPO** *(Coleta, Entrega, Cobrança etc.)* e pode ter inscrições estadual e municipal próprias, o que permite usar o local certo em cada documento da operação.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A aba **ENDEREÇOS** fica no formulário da pessoa e está sempre disponível. Ela traz uma lista com os botões **ADICIONAR** *(à esquerda)*, que abre o formulário **ENDEREÇO**, e **REMOVER** *(à direita)*, que retira o endereço selecionado. O duplo clique numa linha abre o endereço para edição.

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O endereço incluído só é gravado quando você clica em **SALVAR** ou **SALVAR & FECHAR** no formulário da pessoa.*</span>

---

## <font color="#FFAE00">▌</font>LISTA DE ENDEREÇOS

![Lista com um endereço de entrega](e03_grid.png){width=100%}

### ▌BARRA DE BOTÕES

| Botão | Para que serve | Quando fica ativo |
| --- | --- | --- |
| **ADICIONAR** | Abre o formulário **ENDEREÇO** para incluir um novo endereço. | Sempre. |
| **REMOVER** | Retira da lista o endereço selecionado. | Com um endereço selecionado. |

### ▌COLUNAS DA LISTA

| Coluna | O que mostra |
| --- | --- |
| **TIPO** | Finalidade do endereço *(Geral, Coleta, Entrega etc.)*. |
| **LOGRADOURO** | Rua, avenida etc. |
| **NÚMERO** | Número do endereço. |
| **BAIRRO** | Bairro. |
| **ESTADO** | Estado. |
| **CIDADE** | Cidade. |
| **IM** | Inscrição municipal do endereço. |

### ▌COLUNAS OCULTAS

Ficam ocultas até você ativá-las pelo menu de qualquer coluna.

| Coluna | O que mostra |
| --- | --- |
| **LATITUDE** | Latitude do endereço. |
| **LONGITUDE** | Longitude do endereço. |

---

## <font color="#FFAE00">▌</font>FORMULÁRIO DO ENDEREÇO

Ao clicar em **ADICIONAR**, abre a janela **ENDEREÇO**.

![Formulário Endereço em branco](e01_form_mapa.png){width=100%}

### ▌CAMPOS

| Campo | Para que serve |
| --- | --- |
| **CEP** | CEP do endereço, com máscara. Ao sair do campo, o sistema busca o CEP e preenche logradouro, bairro, país, estado e cidade, com a mensagem **CEP ENCONTRADO COM SUCESSO!**. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **TIPO** | Finalidade do endereço: Geral *(padrão)*, Coleta, Entrega, Cobrança, Armazenamento, Outro ou Desativado. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **LOGR.** | Rua, avenida etc. *(até 250 caracteres)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **NÚMERO** | Número do endereço *(até 10 caracteres)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **COMPL.** | Complemento *(até 100 caracteres)*. |
| **BAIRRO** | Bairro *(até 150 caracteres)*. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **PAÍS** | País do endereço. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **ESTADO** | Estado do endereço. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **CIDADE** | Cidade do endereço. Liberada depois de escolher o estado. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| **IE** | Inscrição estadual ligada a esse endereço *(até 30 caracteres)*. |
| **ISENTO** | Indica que o endereço é isento de inscrição estadual. |
| **NAT. FISCAL** | Enquadramento fiscal do endereço: Armazenagem ou transporte, Indústria, Comércio, Prestador de serviços de comunicação, Gerador ou distribuidor de energia, Produtor Rural, Prestador não contribuinte, Prestador sem nota-fiscal ou Prestador contribuinte. |
| **INSCR. MUN.** | Inscrição municipal ligada a esse endereço *(até 30 caracteres)*. |
| **LATITUDE** | Latitude do endereço. |
| **LONGITUDE** | Longitude do endereço. |
| **ASSERTIVIDADE** | Indicador de precisão da localização *(0% enquanto não há coordenadas)*. |

### ▌BOTÕES

| Botão | Para que serve |
| --- | --- |
| **SALVAR** | Inclui o endereço na lista e fecha a janela. |
| **ENCONTRAR LAT/LONG** | Encontra a latitude e a longitude a partir do endereço informado. |
| **FECHAR** | Fecha a janela sem incluir o endereço. |

### ▌EXEMPLO DE ENDEREÇO

![Endereço de entrega preenchido pelo CEP](e02_preenchido_mapa.png){width=100%}

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Comece pelo **CEP**: o sistema preenche logradouro, bairro, país, estado e cidade. Depois, complete número, complemento e tipo.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O botão **ENCONTRAR LAT/LONG** usa um serviço de mapas externo, que consome créditos universais a cada uso.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
