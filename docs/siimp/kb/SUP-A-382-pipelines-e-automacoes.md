# 🤖 PIPELINES E AUTOMAÇÕES

- ID: SUP-A-382
- Caminho: 
- Fonte: https://siimp.youtrack.cloud/articles/SUP-A-382
- Filhos: PO-A-127 🗒️ Exportar CONEMB de CT-es; PO-A-128 🗒️ Exportar OCOREN; PO-A-129 🗒️ Impressão de CT-es - DACTE; PO-A-130 ⏲️ Emissão de CT-es; PO-A-131 🗒️ Exportar DOCCOB; PO-A-132 ⏲️ Importação de Notas via Banco de Notas; PO-A-133 🗒️ Exportar Comprovantes de Entrega; PO-A-134 🗒️ Exportar Anexos de Movimentações de Notas de Entrada; PO-A-135 ⏲️ Gerar CT-es; PO-A-136 🔗 Enviar Coletas para a FourKites; PO-A-137 🔗 Enviar Entregas para a FourKites; PO-A-138 🗒️ Aviso de Vencimento de AET; PO-A-139 🔗 Atualizar Odômetro do Veículo; PO-A-140 ⏲️ Gerar Fatura de CT-es; PO-A-141 ⏲️ Gerar Fatura de Minutas; PO-A-142 🗒️ Exportar Relatório Personalizado; PO-A-143 🗒️ Envio de Relatório para Terceiros; PO-A-144 🔗 Enviar Parceiros de Negócio para o SAP; PO-A-145 🗒️ Exportar XML e PDF de Documentos (NF-es, CT-es e NFS-es); PO-A-146 ⏲️ Aviso de Vencimento; PO-A-147 ⏲️ Atrelar Notas Fiscais da Ordem de Coleta; PO-A-148 🗒️ Exportar Ocorrência para Magazine Luiza; PO-A-149 ⏲️ Atualizar Dados de Visualização; PO-A-150 ⏲️ Importação de CT-es da Central via Banco de CT-es; PO-A-151 ⏲️ Importação de CT-es Emitidos via Banco de CT-es; PO-A-152 🔗 Importar Ocorrências do SSW; PO-A-153 🔗 Disparo de Webhook Personalizado; PO-A-154 🗒️ Exportar NOTFIS de CT-es; PO-A-155 🔗 Notificação de Alteração de Atracação; PO-A-156 🔗 Lembrete de Abertura de Gate; PO-A-157 ⏲️ Gerar Comissão para Vendedores; PO-A-158 🔗 Enviar Faturas para a TSimples; PO-A-160 🗒️ Exportar Anexos de Movimentações à Pagar; PO-A-161 🔗 Enviar Ocorrências para Integração; PO-A-162 🗒️ Enviar Follow Up de Programação de Viagem para Clientes; PO-A-163 🔗 Enviar CT-es para Integração; PO-A-164 🔗 Enviar CT-e para SB1; PO-A-165 🔗 Enviar Minuta Comum para SB1; PO-A-166 🔗 Envia as Minutas Através do Romaneio (SB1); PO-A-167 🔗 Envia as Minutas Através da Programação de Viagem (SB1); PO-A-168 🗒️ Aviso de Vencimento de Fatura; PO-A-169 🗒️ Aviso de Fatura Vencida; PO-A-170 🗒️ Importação de PREFAT via FTP
- Anexos (não baixados): exemplo_filtro.mp4; exemplo_automacao.mp4; image-20221130-211234.png; image-20221130-211151.png; image-20221130-203140.png; image-20221130-200752.png; image-20221130-200741.png; image-20221130-200707.png

---

# 🗒️ INTRODUÇÃO

Olá a todos 👋

Aqui neste espaço, você encontrará todos os manuais referente ao cadastramento, utilização e configuração das *regras de execução*, *automações* e *rotinas de apoio* disponíveis no Siimp.

Abaixo, encontra-se uma lista elencada por tipo de regra. Você também pode utilizar a barra de pesquisa desta base de conhecimento para encontrar o nome da integração desejada e descobrir como realizar a configuração necessária para uso.

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *Esta documentação pode conter termos técnicos amplamente utilizados na área técnica de TI. Ela não foi pensada para ser uma documentação ao usuário comum. Recomendamos fortemente que as ações tomadas através das instruções destas documentações sejam feitas por times técnicos da sua transportadora*!

Na Siimp, há 3 definições distintas sobre este assunto:

* **REGRAS DE EXECUÇÃO** *(também chamado de **PIPELINE**)*
* **AUTOMAÇÕES**
* **ROTINAS DE APOIO**

Nesta documentação, explicaremos a diferença de cada uma delas.

---

# ❓ O QUE É UMA REGRA DE EXECUÇÃO / PIPELINE

Uma **REGRA DE EXECUÇÃO** *(também chamado de **PIPELINE**)* é um *passo-a-passo de ações a serem tomadas pelo sistema em uma ordem específica*. Estas regras são definidas diretamente no sistema, e possuem o conjunto de instruções necessárias para executar uma determinada ação.

Ao pararmos para analisar a afirmação acima, identificamos que *cada ação que o usuário toma no sistema, em seu dia-a-dia, desencadeia a execução de uma dessas regras*, como por exemplo:

* **EXPORTAR OCOREN:** Esta regra contém o passo-a-passo de como montar um arquivo OCOREN completo, e retornar o mesmo arquivo para *download*.
* **EMITIR CT-E:** Esta regra contém o passo-a-passo de como se comunicar com a SEFAZ a fim de autorizar um CT-e, averbando-o logo em seguida (se necessário), e retornando uma confirmação de sucesso e/ou erro no histórico.
* **ATIVAR VEÍCULO:** Esta regra contém o passo-a-passo de como validar se um veículo pode ser ativado novamente, verificando os cursos e licenças a fim de identificar se há algum vencido, além de observar se o usuário possui permissão para executar esta ação, retornando o sucesso e/ou erro da operação em tela.
* **ENVIAR PARA GRIS:** Esta regra contem o passo-a-passo de como realizar a comunicação com uma integração de gerenciamento de risco e enviar todos os dados necessários para espelhamento de uma viagem.

---

# ❓O QUE É UMA AUTOMAÇÃO

Uma **AUTOMAÇÃO** é um *agendador de tarefas que ativa uma* ***REGRA DE EXECUÇÃO*** *de forma automática*. Ele se comporta similarmente ao agendador de tarefas do sistema operacional, podendo ser configurado de várias formas possíveis. Dentro do sistema, há um local específico para cadastramento e gerenciamento destas regras de automação, conforme explicado abaixo:

## 📖 COMO REALIZAR A CONFIGURAÇÃO DE AUTOMAÇÕES

1️⃣ Primeiramente, acesse o menu **OPÇÕES → AUTOMAÇÕES → AUTOMAÇÕES**

![](image-20221130-200707.png)

2️⃣ Para criar uma nova automação, clique em **NOVO.**

![](image-20221130-200741.png)

3️⃣ Será aberta a tela de criação de uma nova automação. Nela, preencha os seguintes campos:

![](image-20221130-203140.png)

* **TIPO DA REGRA:** *Identificador da REGRA DE EXECUÇÃO/PIPELINE que deve ser acionada*.

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *O identificador da regra de execução é um código único e não sequencial que identifica no sistema qual a regra de execução se refere aquela automação. Este código poderá ser encontrado dentro de cada uma documentações específicas de regras de execução.*

* **A PARTIR DE:** Data e hora que deve ser considerada para filtrar os resultados necessários que serão utilizados na regra de execução informada no campo anterior.
* **NOME DA REGRA:** Nome/descrição livre da regra de execução sendo acionada automaticamente.
* **MÉTODO DE ENVIO:** Utilizado quando a regra de execução devolve a exportação de um ou vários arquivos que devem ser enviados por **E-MAIL**, **FTP** ou **MENSAGEIRO** configurado nas abas correspondentes. Por padrão, o sistema coloca a opção **OUTRO**, a qual identifica que a regra não irá gerar um arquivo exportável *(somente realizará a execução da regra)*.
* **VERSÃO:** Utilizado quando a regra possui variações de versões, onde cada uma delas pode executar um trecho diferente. É mais utilizada em casos de exportação de arquivos EDI. Nesse caso, a versão indica qual é o EDI que deve ser exportado *(verifique a documentação de cada uma das regras de execução para identificar se este campo é ou não é obrigatório)*.
* **USUÁRIO:** Indica qual é o usuário que a automação utilizará para acionar a regra de execução.
* **CONFIGURAÇÕES DE CRON:** Configuração de expressão *crontab*. É com base nessa configuração que o sistema consegue agendar quando a regra de execução deve ser chamada.

> <span style="color:dodgerblue;">***DICA:***</span> *Sempre que você altera alguma informação da expressão, o sistema mostra logo abaixo o que a sua expressão significa. No exemplo da imagem acima, a expressão crontab preenchida nos campos equivale a executar a regra **ÀS 04:00, TODO DIA**. Caso você não saiba configurar uma expressão crontab, utilize a seguinte ferramenta:* <https://crontab-generator.org/>*. O site é em inglês, mas ajuda bastante.*

* **ATIVO:** Marcação que identifica que a automação está ativa e que, no momento do agendamento informado, poderá acionar a regra de execução.
* **ABA CONFIGURAÇÕES:** Conjunto de parâmetros específicos para a utilização e configuração da regra de execução. Abaixo, segue uma demonstração de como realizar a inserção de configurações dentro desta aba:

![](exemplo_automacao.mp4)

* **ABA E-MAIL:** Contém todas as informações presentes necessárias para o envio de um arquivo exportado por uma regra de execução via e-mail.
* **ABA FTP:** Contém todas as informações presentes necessárias para o envio de um arquivo exportado por uma regra de execução via FTP.
* **ABA MENSAGEIRO:** Contém todas as informações presentes necessárias para o envio de um arquivo exportado por uma regra de execução via mensageiro interno.

Após a inserção dos dados, basta clicar no botão **SALVAR**.

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *Quando o agendador de tarefas identifica que uma regra de execução/pipeline deve ser acionada, o sistema manda a execução para uma fila para que o processamento seja feito de forma assíncrona*. Isso se deve ao fato do sistema ser multi clientes (vários clientes podem querer executar coisas diferentes no mesmo horário). Dentro desta fila, o sistema utiliza alguns robôs que capturam estas execuções e realizam o procedimento da regra *individualmente*.
>
> *Em outras palavras, isso significa que: Se você configurar uma regra de envio de CT-es em lote para a SEFAZ, e dentro desse lote há 20 mil CT-es, o sistema não vai mandar todos de uma vez*. Em vez disso, ele vai *enfileirar* todos os CT-es e enviar um por um compassadamente, compartilhando o processamento da fila com outros clientes que a utilizem para fazer outras regras, como gerar 18 mil arquivos OCOREN. Essa carga distribuída faz com que *a fila nunca seja monopolizada por um único cliente*.

---

# 🛑 LIMITES

Disponibilizamos uma fila padrão que pode ser utilizada por qualquer cliente a qualquer momento para executar qualquer regra. Porém, esta fila tem *limitações de uso*. Estas limitações visam operar a fila em uma ordem sequencial constante, permitido que todos possam usufruir de seus processos dentro da disponibilidade do servidor, impedindo que alguns clientes “monopolizem” a fila para si mesmos, executando vários processos gigantescos e demorados. Por conta disso, *temos dois tipos de limites*, sendo eles **LIMITE POR TEMPO DE PROCESSAMENTO** e **LIMITE POR EXECUÇÕES**.

## 1️⃣ LIMITE POR TEMPO DE PROCESSAMENTO

Atualmente, temos uma quantidade fixa de robôs disponíveis para atender os processos executados dentro da fila padrão. O robô só pode ficar executando uma determinada regra durante ***5 MINUTOS***. Após este tempo, o processo é interrompido e um erro será exibido no histórico da automação.

Este tipo de limite impede que algum cliente queira, por algum motivo, usar uma regra de execução para gerar um arquivo tão gigantesco que monopolizaria o robô por longos minutos ou horas.

Isso faz com que o cliente utilize técnicas para quebrar o arquivo em partes, pesquisando intervalos menores e/ou com menos quantidade de dados a fim de executar uma regra desejada.

## 2️⃣ LIMITE POR EXECUÇÕES

Cada regra *pode ser executada uma quantidade limitada de vezes durante um determinado período*. Isso garante uma rotatividade segura na execução de regras automáticas de todos os nossos clientes. Para exemplificar, vamos supor o seguinte cenário:

* O cliente criou uma automação que deve importar as notas fiscais do banco de notas a cada 10 minutos para a sua Central de Notas *(regra existente em*  PO-A-132\*)\*.
* Na primeira vez que a automação acionou a regra de execução, 9000 notas fiscais foram encontradas.
* Para esta regra de execução, há um limite de execuções de *100 por minuto*. Ou seja, em um minuto, o sistema poderá importar, no máximo, 100 notas fiscais.
* O processo de importação de notas fiscais demora apenas alguns segundos, e em questão de 20 segundos, 100 notas já foram importadas, faltando 8900.
* No entanto, como há um limitador de execuções para a fila padrão, a automação *só poderá importar mais 100 notas fiscais após aguardar o próximo minuto*. Então, o sistema de automação põe as demais 8900 notas fiscais em aguardo, até que o tempo de espera seja cumprido.
* Enquanto isso, o sistema de automações pode acionar outras regras de execução suas e/ou de outros clientes, disponibilizando o processamento para que outras regras possam usufruí-lo.

> *Ah, mas eu não queria esperar esse tempo todo para executar os meus processos* 😠

Sem problemas. Diferentemente do **LIMITE POR TEMPO DE EXECUÇÃO**, este limitador conseguimos contornar disponibilizando um *fila dedicada para a sua empresa*. Com isso, o processamento utiliza recursos dedicados de processamento e memória, sendo possível até mesmo disponibilizar uma quantia maior de robôs que podem atender os mais diversos processos que quiser executar.

No entanto, ***ESTE É UM SERVIÇO CONTRATADO A PARTE***. Com isso, você deverá pedir uma cotação junto ao nosso time comercial através de [comercial@siimp.com.br](mailto:comercial@siimp.com.br). Dessa forma, podemos entender a operação necessária que precisa ser feita, e separar uma máquina específica para capturar somente a sua carga de trabalho e executá-la de uma forma muito mais rápida.

---

# 🔍 USANDO FILTROS DISPONÍVEIS NA TELA DE PESQUISA

Algumas regras de execução permitem que você utilize os mesmos filtros que você usa no seu dia-a-dia para configurar uma automação. Isso facilita os trabalhos repetitivos de disparo de execuções.

Dessa forma, você pode preencher os filtros na tela que você normalmente utiliza no dia-a-dia, e clicar no botão de **AUTOMAÇÃO** no canto direito inferior. Assim, o sistema irá capturar os nomes técnicos de cada filtro e salvá-los na automação que estiver aberta naquele momento.

![](exemplo_filtro.mp4)

> <span style="color:red;">***ATENÇÃO:***</span> *Sempre que uma regra de execução puder utilizar os filtros da tela de pesquisa para filtrar os resultados, a documentação estará com uma indicação **SUPORTA FILTRO EM TELA:*** <font color="Green">***SIM***</font>

---

# 🛠️ CONFIGURAÇÃO PADRÃO DE NOMENCLATURA

Ao usar uma regra de execução em uma automação que é **EXPORTÁVEL** <font color="Green">SIM</font>, o sistema tentará gerar um nome único, com padrão que não se repete, antes de enviar por e-mail e/ou FTP. No entanto, se a sua regra precisa exportar um arquivo que possua uma lógica exata na nomenclatura, você pode construí-la usando o seguinte parâmetro:

* <font color="Blue">**\[ OPCIONAL \]**</font> `rename`: Se informado, renomeia o arquivo a ser exportado para o nome desejado. Você pode utilizar algumas *tags* específicas para tornar a sua nomenclatura única, como por exemplo:
  * Ao utilizar o parâmetro com o valor `OCOREN_[[d]][[m]][[Y]]`, a automação irá exportar um arquivo com o nome `OCOREN_03122022`.
  * Ao utilizar o parâmetro com o valor `DACTES_[[yesterday]]`, a automação irá exportar um arquivo com o nome `DACTES_02122022`.
  * Ao utilizar o parâmetro com o valor `COMPROVANTES_[[Y]][[m]][[d]]_AS_[[H]][[i]]`, a automação irá exportar um arquivo com o nome `DACTES_20221203_AS_1437`.

Abaixo, segue uma tabela completa com todas as *tags* que podem ser utilizadas no parâmetro `rename`:

| **TAG** | **SIGNIFICADO** | **EXEMPLO** |
| --- | --- | --- |
| [[yesterday]] | Data de ontem no formato `dmY` | `02122022` |
| [[tomorrow]] | Data de amanhã no formato `dmY` | `04122022` |
| [[today]] | Data de hoje no formato `dmY` | `03122022` |
| [[now]] | Agora, no formato `dmYHis` | `03122022143705` |
| [[Y]] | Ano, com 4 dígitos | `2022` |
| [[y]] | Ano, com 2 dígitos | `22` |
| [[m]] | Mês, com 2 dígitos | `12` |
| [[d]] | Dia, com 2 dígitos | `03` |
| [[H]] | Hora, com 2 dígitos, no formato 24 horas. | `14` |
| [[h]] | Hora, com 2 dígitos, no formato 12 horas. | `02` |
| [[i]] | Minuto, com 2 dígitos | `37` |
| [[s]] | Segundo, com 2 dígitos | `05` |

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Algumas regras de execução que exportam arquivos podem possuir tags adicionais disponíveis para nomenclatura*. Para identificá-las, verifique a documentação específica de cada uma das regras.

---

# 📅 PARÂMETROS DE DATAS DE FORMATOS RELATIVOS

Alguns parâmetros utilizados nas regras de execução são datas. No entanto, a inserção de uma data fixa faz com que uma automação perca completamente seu sentido, uma vez que a data não será alterada no momento da execução. Para isso, utilizamos uma *notação de data relativa* para estes campos, assim podemos calcular uma data a ser utilizada na regra de execução no momento em que ela é acionada.

Por padrão, os formatos relativos utilizados são todos aqueles mencionados na documentação oficial do PHP: <http://php.adamharvey.name/manual/kr/datetime.formats.relative.php>. Abaixo, vamos deixar uma documentação traduzida dos significados e exemplificar o uso de alguns deles *(mas você pode acessar a documentação oficial e compreender o uso de qualquer um deles, se desejar)*.

![](https://docs.google.com/spreadsheets/d/1UHeX6ueqw4ilDIH-SA7RrX5LKiJHqfuJBacAl5rVZaE/edit?usp=sharing)

* Em uma regra de execução automática de geração de faturas, eu sempre irei gerar uma fatura por CT-e. A data de vencimento desta fatura sempre será a *primeira segunda-feira da próxima semana*. Neste caso, a configuração `maturity` deverá ser feita com a seguinte descrição: `monday next week`.
* Se em vez disso eu quisesse jogar o vencimento para o *último dia do mês seguinte*, eu poderia monta a configuração `maturity` da seguinte forma: `last day of next month`.
* Ou se em vez disso eu quisesse jogar a data de vencimento sempre para daqui *5 dias úteis*, eu poderia montar a configuração `maturity` da seguinte forma: `+5 weekdays`.

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *Os formatos relativos de dias úteis consideram apenas segunda à sexta-feira*. Feriados não são levados em conta nesta formatação.

Abaixo, seguem mais alguns exemplos de utilização de formatação:

| **EXEMPLO** | **SIGNIFICADO** |
| --- | --- |
| `tomorrow + 3 weekdays` | Três dias úteis após amanhã |
| `+1 week + 1 day` | 1 semana e um dia a partir de hoje |
| `+2 weeks` | 2 semanas a partir de hoje |
| `last friday of this month` | Última sexta-feira deste mês |
| `next wednesday` | Próxima quarta-feira |

---

# 🏁 REGRAS DE EXECUÇÃO DISPONÍVEIS

Abaixo, segue a lista de regras de execução públicas existentes no sistema. Qualquer uma delas pode ser configurada dentro de uma automação:

> <span style="color:dodgerblue;">***DICA:***</span><span style="color:dodgerblue;"></span> *Cada uma das páginas abaixo é definida com um ícone na frente, o qual possui um significado distinto:*

* 🗒️ *significa que a regra é exportável, ou seja, ela gera um arquivo que pode ser enviado via e-mail e/ou FTP.*
* ⏲️ *significa que a regra é uma execução interna, sem geração de arquivo de exportação.*
* 🔗 *significa que a regra é uma execução que usa uma integração que deve ser configurada no sistema, sem geração de arquivo de exportação.*

---

# ❓ O QUE É UMA ROTINA DE APOIO

Uma **ROTINA DE APOIO** é uma *forma manual de acionar uma regra de execução/pipeline*. Basicamente, ela é extremamente útil quando há a necessidade de se disponibilizar para o usuário comum um meio manual de execução de uma regra *(com isso, o seu TI é menos acionado, e menos tickets são gerados* 🙌🤣).

> <span style="color:red;">***ATENÇÃO:***</span> *Nem toda **REGRA DE EXECUÇÃO/PIPELINE** pode ser acionada via rotina de apoio! Portanto, verifique na documentação de cada uma das regras se ela pode ou não ser acionada desta forma. Quando uma regra de execução puder ser ativada via rotina de apoio, a documentação apresentará a seguinte instrução: **ROTINA DE APOIO:*** <font color="Green">***SIM***</font>

A **ROTINA DE APOIO** é disponibilizada dentro de um módulo específico. Isso significa que uma rotina onde os dados de origem são romaneios será disponibilizada dentro do módulo de romaneios. Pode também ser liberada para todos os usuários da empresa e para usuários específicos. Além disso, algumas podem exibir um formulário com algumas informações que devem ser preenchidas pelo usuário antes de executá-la *(o funcionamento de liberação e execução é bem parecido com o que os relatórios personalizados do sistema fazem, caso você tenha acesso a algum deles)*.

Para ativar a **ROTINA DE APOIO** desejada, o usuário precisa selecionar os documentos desejados, e depois clicar em **ROTINAS**, e em seguida escolher a rotina desejada.

![](image-20221130-211234.png)

Em alguns casos, neste momento, pode aparecer um formulário pedindo alguma informação que deverá ser preenchida para ativar a rotina. Se isso acontecer, o usuário precisa preenchê-los e clicar em **EXECUTAR** logo em seguida. Caso contrário, a execução se dará no mesmo momento.

> <span style="color:red;">***ATENÇÃO:***</span><span style="color:red;"></span> *As rotinas de apoio que exibem formulários serão informadas diretamente na documentação das regras de execução/pipelines que as ativam.*

A grande vantagem ao executar uma rotina de apoio é exigir que o *pipeline seja executado no mesmo momento*. Isso quer dizer que a execução *não entra na mesma fila que a automação*, obtendo uma resposta de sucesso e/ou erro no mesmo momento.

---

# 🤓 RESUMÃO

Em suma, conhecendo todos os conceitos apresentados acima, basta se lembrar que:

> *Uma REGRA DE EXECUÇÃO/PIPELINE pode ser executada automaticamente via AUTOMAÇÃO e/ou manualmente através de uma ROTINA DE APOIO.*
