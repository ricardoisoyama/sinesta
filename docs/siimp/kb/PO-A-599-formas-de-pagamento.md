# Formas de Pagamento

- ID: PO-A-599
- Caminho: 🛟 BASE DE CONHECIMENTO > EMPRESA > Formas de Pagamento
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-599
- Anexos (não baixados): 00_banner.png; 01_listagem.png; 02_form_novo.png; 03_form_edicao.png; 99_rodape.png

---

![Formas de Pagamento](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

Ao comprar de um fornecedor, a empresa precisa registrar como vai pagar: por qual meio *(boleto, PIX, cartão etc.)* e em quantas parcelas, com quais prazos. Sem um padrão, essas condições são digitadas a cada compra, com risco de erro nos vencimentos e nos valores das parcelas.

O cadastro de **FORMAS DE PAGAMENTO** resolve isso. Cada forma reúne o meio de pagamento e o plano de parcelas *(prazos em dias corridos ou úteis e o percentual de cada parcela)*, e fica pronta para ser escolhida nas compras.

As formas de pagamento são usadas somente em dois pontos do sistema: na vinculação da **COTAÇÃO DE COMPRA** e na geração de uma movimentação a partir de uma **NF DE ENTRADA**. Quem cadastra e mantém as formas costuma ser a área de compras ou o financeiro.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **FORMAS DE PAGAMENTO** lista, cadastra e altera as formas de pagamento da empresa, com o meio de pagamento, os valores mínimo e limite e as parcelas.

Caminho: menu do usuário *(ícone de pessoa no canto superior direito)* **-> EMPRESA -> FORMAS DE PAGAMENTO**.

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra todas as formas de pagamento cadastradas, da mais recente para a mais antiga.

![Listagem de formas de pagamento](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre o formulário para cadastrar uma nova forma de pagamento. | Sempre. |
| ❷ | **REMOVER** | Remove as formas de pagamento marcadas na listagem. | Sempre. |
| ❸ | **ATUALIZAR** | Recarrega a listagem com os dados mais recentes. | Sempre. |
| ❹ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❺ | **NOME** | Filtra pelo nome da forma de pagamento. |
| | **MEIO PGTO.** | Filtra pelo meio de pagamento: Dinheiro, Cheque, Transferência, Depósito, Cartão, Boleto, Débito em Conta, PIX ou Crédito em Conta. |
| | **BUSCAR** *(lupa)* | Aplica os filtros informados. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❻ | **CÓDIGO** | Número da forma de pagamento, gerado pelo sistema. |
| | **NOME** | Nome da forma de pagamento. |
| | **MEIO PGTO.** | Meio de pagamento da forma. |
| | **ATIVO?** | Se a forma está ativa *(SIM)* ou inativa *(NÃO)*. |

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Marque a caixa no início de cada linha para selecionar várias formas antes de usar o **REMOVER** ❷.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O formulário abre pelo botão **NOVO** ❶ da listagem, na janela **NOVA FORMA DE PAGAMENTO**. Ele tem os dados principais no topo e, abaixo, o grupo **PARCELAS DO PAGAMENTO**.

![Formulário de nova forma de pagamento](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Dados principais | **NOME** | Nome da forma de pagamento, como vai aparecer nas compras. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **TIPO** | Meio de pagamento: Dinheiro, Cheque, Transferência, Depósito, Cartão, Boleto, Débito em Conta, PIX ou Crédito em Conta. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **VALOR MÍNIMO** | Menor valor de compra para usar esta forma. |
| | | **LIMITE** | Maior valor de compra para usar esta forma. |
| ❷ | Geração de parcelas | **ENTRADA?** | Se a forma tem entrada: NÃO ou SIM. Padrão: NÃO. |
| | | **PARCELAS** | Quantidade de parcelas a gerar. Padrão: 1. |
| | | **A CADA** | Intervalo entre uma parcela e outra, na unidade do campo **PERÍODO**. Padrão: 1. |
| | | **PERÍODO** | Unidade do intervalo: Dia(s) ou Mes(es). Padrão: Mes(es). |
| | | **TIPO** | Como os dias são contados: Corridos ou Úteis. Padrão: Corridos. |
| ❸ | Geração de parcelas | **GERAR PARCELAS** *(engrenagem)* | Monta as parcelas na grade a partir dos campos do grupo ❷. |
| ❹ | Parcelas | **ADICIONAR** *(+)* | Inclui uma parcela na grade. |
| ❺ | Parcelas | **REMOVER** *(lixeira)* | Exclui a parcela selecionada na grade. |
| ❻ | Parcelas | **POSIÇÃO** | Ordem da parcela *(1ª, 2ª, 3ª...)*. |
| | | **DIAS** | Prazo da parcela, em dias. |
| | | **TIPO** | Se o prazo é em dias Corridos ou Úteis. |
| | | **PORCENTAGEM** | Parte do valor total que cabe à parcela. |
| ❼ | Barra de ações | **SALVAR & NOVO** | Salva a forma e abre um formulário em branco para cadastrar outra. |
| | | **SALVAR** | Salva a forma de pagamento. |
| | | **ATIVO?** | Deixa a forma ativa *(marcado)* ou inativa *(desmarcado)*. Vem marcado. |
| | | **FECHAR** | Fecha o formulário. |

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*As linhas da grade de parcelas podem ser editadas direto na grade (posição, dias, tipo e porcentagem). Para mudar a ordem das parcelas, arraste a linha para cima ou para baixo: a posição é atualizada.*</span>

### ▌EDITAR UMA FORMA DE PAGAMENTO

Para alterar uma forma de pagamento, dê um duplo clique na linha dela na listagem. A janela abre com o nome da forma no título e com todos os campos e as parcelas já preenchidos.

![Forma de pagamento aberta para edição](03_form_edicao.png){width=100%}

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Os campos e os botões são os mesmos do cadastro.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*As formas de pagamento cadastradas aqui só aparecem em dois lugares atualmente: na vinculação da **COTAÇÃO DE COMPRA** e na geração de uma movimentação a partir de uma **NF DE ENTRADA**.*</span>

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Para deixar de usar uma forma de pagamento sem perder o histórico, desmarque o **ATIVO?** em vez de removê-la.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
