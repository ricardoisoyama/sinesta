# Fechamento de Caixa

- ID: PO-A-806
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > Fechamento de Caixa
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-806

---

![Fechamento de Caixa](00_banner.png){width=100%}

## <font color="#FFAE00">▌</font>INTRODUÇÃO

O **FECHAMENTO DE CAIXA** congela as movimentações de uma carteira até uma data. Depois do fechamento, nenhum lançamento daquela carteira com data até a data final pode ser editado, e o saldo conferido fica registrado.

O objetivo é dar segurança à conferência financeira: o saldo de cada carteira é apurado e travado periodicamente, evitando que alterações retroativas mudem valores já conferidos.

O módulo é usado pela área financeira, que fecha as carteiras após conferir os saldos. A reabertura de um fechamento é restrita a usuários com permissão e exige um motivo, que fica registrado no histórico.

O fechamento trabalha sobre as carteiras cadastradas no sistema e sobre as movimentações financeiras lançadas nelas.

---

## <font color="#FFAE00">▌</font>VISÃO GERAL

A tela **FECHAMENTO DE CAIXA** lista os fechamentos já feitos, permite fechar o caixa de uma carteira até uma data, reabrir o último fechamento e consultar o histórico de cada carteira. Fica em **FINANCEIRO -> FECHAMENTO DE CAIXA**.

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*A tela abre com todos os fechamentos, do mais recente para o mais antigo.*</span>

---

## <font color="#FFAE00">▌</font>LISTAGEM

A listagem mostra um fechamento por linha, com a carteira, o período, o saldo apurado e quem fechou.

![Listagem do Fechamento de Caixa](01_listagem.png){width=100%}

### ▌BARRA DE BOTÕES

| Nº | Botão | Para que serve | Quando fica ativo |
| :---: | --- | --- | --- |
| ❶ | **NOVO** | Abre a janela **NOVO FECHAMENTO DE CAIXA** para fechar o caixa de uma carteira. | Sempre. |
| ❷ | **ATUALIZAR** | Recarrega a listagem. | Sempre. |
| ❸ | **EXPORTAR** | Exporta a listagem em CSV, PDF ou XLSX, de todas as páginas ou só da página atual. | Sempre. |
| ❹ | **HISTÓRICO** | Abre o histórico de fechamentos e reaberturas de uma carteira *(ver **HISTÓRICO**)*. | Sempre. |
| ❺ | **REABRIR** | Abre a janela **REABRIR FECHAMENTO DE CAIXA** para desfazer o último fechamento de uma carteira *(ver **REABRIR**)*. | Só aparece para usuários com permissão de reabrir fechamentos. |

### ▌BUSCA

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❻ | **TODAS AS CARTEIRAS** | Filtra os fechamentos de uma carteira. As carteiras aparecem agrupadas por empresa. |
| | **DATA INICIAL** | Filtra pela data inicial do período fechado. |
| | **DATA FINAL** | Filtra pela data final do período fechado. |
| | **FECHADO DE** | Mostra só os fechamentos feitos a partir desta data. |
| | **FECHADO ATÉ** | Mostra só os fechamentos feitos até esta data. |
| | **LUPA** | Aplica os filtros preenchidos. |

### ▌COLUNAS DA LISTAGEM

| Nº | Coluna | O que mostra |
| :---: | --- | --- |
| ❼ | **CARTEIRA** | Carteira que teve o caixa fechado. |
| | **DATA INICIAL** | Início do período fechado. Fica em branco em parte dos registros. |
| | **DATA FINAL** | Data até a qual as movimentações ficaram travadas. |
| | **SALDO** | Saldo da carteira apurado no fechamento. |
| | **FECHADO EM** | Data e hora em que o fechamento foi feito. |
| | **FECHADO POR** | Usuário que fez o fechamento. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Os filtros só são aplicados ao clicar na **LUPA** ❻. Escolher uma carteira sem clicar na lupa não muda a listagem.*</span>

---

## <font color="#FFAE00">▌</font>FORMULÁRIO

O botão **NOVO** ❶ abre a janela **NOVO FECHAMENTO DE CAIXA**. Salvar esta janela já fecha o caixa da carteira.

![Novo Fechamento de Caixa](02_form_novo.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Dados do fechamento | **CARTEIRA** | Carteira que terá o caixa fechado. As carteiras aparecem agrupadas por empresa. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **DATA FINAL** | Data até a qual as movimentações da carteira ficam travadas. Vem preenchida com a data de ontem. |
| | | **SALDO FINAL** | Saldo da carteira até a data final, só para conferência. É recalculado ao trocar a carteira ou a data. Aparece em verde quando positivo e em vermelho quando negativo. |
| ❷ | Aviso | **ATENÇÃO** | Lembra de conferir o saldo antes de fechar, que nada até a data final poderá ser editado e que a reabertura exige permissão. |
| ❸ | Botões | **SALVAR E FECHAR** | Grava o fechamento e fecha a janela. |
| | | **FECHAR** | Fecha a janela sem fechar o caixa. |

Com a carteira escolhida, o saldo aparece antes de salvar:

![Novo Fechamento de Caixa preenchido](03_form_preenchido.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Confira o **SALDO FINAL** antes de salvar. Depois do fechamento, nenhuma movimentação da carteira com data até a **DATA FINAL** pode ser editada.*</span>

### ▌EDITAR UM FECHAMENTO DE CAIXA

Um fechamento não pode ser editado: o duplo clique na linha da listagem não abre nada.

> <span style="background-color: #2980b9; color: white; padding: 3px 5px; border-radius: 4px">**DICA**</span>
>
> <span style="color:dodgerblue;">*Para corrigir um fechamento, use **REABRIR** e faça um novo fechamento com os dados certos.*</span>

---

## <font color="#FFAE00">▌</font>AÇÕES DO CAIXA

Além de fechar o caixa, a tela permite reabrir o último fechamento de uma carteira e consultar o histórico de fechamentos e reaberturas.

### ▌REABRIR

O botão **REABRIR** ❺ abre a janela **REABRIR FECHAMENTO DE CAIXA**. A reabertura desfaz o último fechamento da carteira: o registro sai da listagem e as movimentações voltam a poder ser editadas.

![Reabrir Fechamento de Caixa](05_reabrir_vazio.png){width=100%}

| Nº | Grupo | Campo | Para que serve |
| :---: | --- | --- | --- |
| ❶ | Dados da reabertura | **CARTEIRA** | Carteira que terá o último fechamento reaberto. <span style="color:red;">**OBRIGATÓRIO.**</span> |
| | | **MOTIVO** | Por que o fechamento está sendo reaberto. Mínimo de 15 caracteres. Fica gravado no histórico. |
| ❷ | Aviso | **ATENÇÃO** | Lembra que só o último fechamento é reaberto e que o motivo precisa de 15 caracteres ou mais. |
| ❸ | Botões | **REABRIR** | Reabre o último fechamento da carteira escolhida. |
| | | **FECHAR** | Fecha a janela sem reabrir nada. |

Preenchido, fica assim:

![Reabrir Fechamento de Caixa preenchido](06_reabrir_preenchido.png){width=100%}

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*Depois de clicar em **REABRIR**, a janela continua aberta e não mostra mensagem de confirmação. Confira na listagem que o fechamento saiu e feche a janela pelo botão **FECHAR**.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*O botão **REABRIR** só aparece para usuários com permissão de reabrir fechamentos de caixa.*</span>

### ▌HISTÓRICO

A janela **HISTÓRICO** mostra, por carteira, cada fechamento e cada reabertura, com data, mensagem e usuário.

![Histórico](07_historico.png){width=100%}

| Nº | Elemento | Para que serve |
| :---: | --- | --- |
| ❶ | **CARTEIRA** | Carteira cujo histórico será exibido. A lista carrega ao escolher a carteira. |
| ❷ | **DATA** | Data e hora do evento. |
| | **CARTEIRA** | Carteira do evento. |
| | **MENSAGEM** | O que aconteceu: fechamento adicionado *(com data final e saldo)* ou fechamento removido *(com data, saldo e o motivo da reabertura)*. |
| | **USUÁRIO** | Usuário que fez o fechamento ou a reabertura. |

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*No momento, o botão **HISTÓRICO** da listagem não abre a janela por um erro do sistema. Esta seção mostra como a janela funciona quando o botão estiver corrigido.*</span>

---

## <font color="#FFAE00">▌</font>AVISOS FINAIS

> <span style="background-color: #c0392b; color: white; padding: 3px 5px; border-radius: 4px">**PONTO DE ATENÇÃO**</span>
>
> <span style="color:red;">*O fechamento trava as movimentações financeiras da carteira com data até a **DATA FINAL**. Lançamentos dessas datas só voltam a ser editados depois de reabrir o fechamento.*</span>

> <span style="background-color: #8e44ad; color: white; padding: 3px 5px; border-radius: 4px">**OBSERVAÇÃO**</span>
>
> <span style="color:purple;">*Só o último fechamento de cada carteira pode ser reaberto. Para reabrir um período mais antigo, é preciso reabrir os fechamentos mais recentes antes, um por vez.*</span>

---

![Siimp Sistemas](99_rodape.png){width=100%}

Em caso de dúvidas, entre em contato com o nosso suporte através de [sac@siimp.com.br](mailto:sac@siimp.com.br).
