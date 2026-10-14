# 💲 Nova Fatura + Perfil de Faturamento

- ID: PO-A-226
- Caminho: 🤩 BLOG DE NOVIDADES > 💲 Nova Fatura + Perfil de Faturamento
- Fonte: https://siimp.youtrack.cloud/articles/PO-A-226
- Anexos (não baixados): image.png; image1.png; image2.png; image3.png; image4.png; image5.png; image6.png; image7.png; image8.png; image9.png; image10.png; image11.png

---

Olá a todos 👋

Após as atualizações de **FATURA WEB** *(PO-A-228)* e **FATURA EXPRESS** *(PO-A-230)*, e dando continuidade ao conjunto de refatorações financeiras que tomarão conta do nosso *roadmap* de 2025, gostaríamos de informar a todos as duas novas atualizações de grande porte, sendo elas <u>refatoração do módulo de faturas</u> e a <u>refatoração do módulo de perfil de faturamento</u>.

Abordaremos as principais mudanças nessa postagem, que tem o intuito de informar aos nossos clientes quais mudanças no processo ocorreram, e as melhorias aplicadas em ambos os módulos.

É importante ressaltar que as mudanças em ambos os módulos <u>já estão disponíveis em ambiente de homologação</u>, e entrarão em produção no dia **13/04/2025** *(domingo)*. Para que a atualização ocorra com sucesso e tranquilidade, o ambiente de produção ficará em manutenção nesta data por <u>1 hora</u>.

---

# 1️⃣ FATURAMENTO DE NF-ES

* O cliente de uma fatura de NF-e será sempre o **DESTINATÁRIO** marcado na NF-e emitida.
* A funcionalidade **GERAR MOVIMENTAÇÃO** dentro de **FISCAL -> NF-E** foi removida. Em seu lugar, um botão de **FATURAR** *(contendo as opções MANUAL, INDIVIDUAL e AGRUPADA)* foi colocado, contendo as mesmas funcionalidades do mesmo botão localizado em **CT-ES** e **MINUTAS**.

![](image7.png)

## 🚫 LIMITAÇÕES CONHECIDAS

* A **FATURA EXPRESS** <u>ainda não considera NF-es</u> para realizar o faturamento. Como a funcionalidade foi criada recentemente, e a quantidade de NF-es com necessidade de faturamento é baixa, o sistema ainda não ganhou essa possibilidade. Contudo, ao abrir uma fatura após a sua geração via **FATURA EXPRESS**, é possível adicionar a NF-e no mesmo conjunto de documentos de forma manual.

---

# 2️⃣ PERFIL DE FATURAMENTO

* Os perfis do tipo **FATURA** e **BOLETIM** foram convertidos automaticamente para os tipos **VIA DOCUMENTO** e **VIA BOLETIM**, respectivamente. Além disso, dois novos tipos de perfis foram adicionados, sendo eles **VIA FATURAMENTO** e **VIA OCORRÊNCIA**, que possuem regras de cálculo de vencimento específicas, conforme demonstrado na imagem abaixo.

![](image.png)

* Antigamente, nos tipos de perfis diferentes de **PERÍODO**, o sistema considerava como <u>dia corrido</u> todos os dias da semana, <u>com exceção de feriados</u>. Isso fazia com que clientes que precisavam aplicar dias corridos, mesmo considerando feriados, fossem impactados e não conseguissem realizar tal configuração. Além disso, <u>sábados e domingos eram considerados dias úteis</u> em todos os perfis, com exceção do **PERÍODO** *(lá, sábados e domingos eram desconsiderados caso houvesse a marcação de **PRÓXIMO DIA ÚTIL = SIM**)*. A partir de agora, haverá duas novas configurações, chamadas **DIAS CORRIDOS** e **DIAS ÚTEIS**. Nela, você poderá identificar ao perfil <u>o que, para você, significa um dia útil ou um dia corrido</u>, e o perfil irá obedecer a sua configuração no momento do cálculo do vencimento.
  * Ao marcar as opções **SÁBADO**, **DOMINGO** e **FERIADO**, dentro das configurações de **DIAS CORRIDOS**, o sistema irá considerar que todos esses dias devem ser considerados na contagem de dias. Então, se *(por exemplo)* você possuir um perfil **DIÁRIO**, onde devem-se contar <u>30 dias corridos</u> a partir da data atual, então estes dias serão considerados na contagem. Caso algum deles seja desmarcado, o sistema irá ignorar o dia desmarcado, e não incrementará a contagem de dias. <u>Por padrão, os perfis antigos e novos vem com estes 3 campos marcados</u>.
  * Ao marcar as opções **SÁBADO**, **DOMINGO** e **FERIADO**, dentro das configurações de **DIAS CORRIDOS**, o sistema irá considerar que estes dias são úteis, e não devem ser "pulados" quando o sistema indicar. Isso servirá para que clientes que consideram o sábado como um dia útil, por exemplo, possam usufruir desta configuração para aplicar regras separadas em clientes específicos. <u>Por padrão, os perfis antigos e novos vem com estes 3 campos desmarcados</u>.

> <span style="background-color:mistyrose;">*PS.: Clientes que possuem cadastros de feriados no sistema, e que utilizam perfis **DIÁRIO**, **SEMANAL**, **MENSAL** e/ou **QUINZENAL** devem se atentar a mudança da contabilização de dias corridos. É válido revisar estes perfis de faturamento, caso você identifique que a nova regra de negócio afeta o cálculo de alguma maneira. Lembrando que a configuração pode ser modificada a qualquer momento.*</span>

![](image1.png)

* Antigamente, ao abrir a janela para cadastrar um novo perfil, o sistema já deixava as configurações marcadas para preenchimento de um perfil por **PERÍODO**. A partir de agora, o sistema traz por padrão as configurações do **DIÁRIO**, ainda permitindo a edição pelo usuário.
* A tabela de **PERÍODO** foi completamente removida e substituída por um conjunto de campos que ensinam o usuário a realizar o cadastramento, esclarecendo o que cada etapa irá executar, conforme demonstrado na imagem abaixo:

![](image4.png)

* A partir de agora, você pode <u>simular qual será a data de vencimento</u> que o documento irá receber, clicando no botão **SIMULAR** e preenchendo os campos pertinentes. No retorno, o sistema exibirá uma mensagem com a resposta correspondente.

![](image5.png)

* Foi adicionada uma tabela de histórico, que irá mostrar todas as alterações executadas no perfil.

![](image6.png)

* <span style="background-color:mistyrose;">**[BUGFIX]**</span> Corrigimos o comportamento do **PRÓXIMO DIA ÚTIL**, que não realizava verificações e não pulava para a próxima data de dia útil nos perfils **DIÁRIO**, **SEMANAL**, **QUINZENAL** e **MENSAL**. Agora, este comportamento foi completamente corrigido.
* <span style="background-color:mistyrose;">**[BUGFIX]**</span> Corrigimos o comportamento do perfil **QUINZENAL**. Anteriormente, ele também funcionava como um perfil semanal, pulando 14 dias a partir do domingo atual ou domingo anterior. Este comportamento acabava atrapalhando, obrigando os clientes a migrarem para um perfil de faturamento por período. A partir de agora, o perfil **QUINZENAL** funciona quebrando o mês em duas partes *(do dia 1 à 15, e 16 até o final do mês)*.

## 🚫 LIMITAÇÕES CONHECIDAS

* O novo perfil **VIA OCORRÊNCIA** funciona em quaisquer lançamento de ocorrências no sistema, via OCOREN, via Aplicativo e WhatsApp/Telegram, <u>com a única exceção do módulo **COMPROVANTES**, o qual ainda não possui esta habilidade</u>.
* Somente o novo perfil de faturamento do tipo **VIA FATURAMENTO** irá funcionar nos faturamentos de NF-es, uma vez que a NF-e possui tags de vencimento diferentes do CT-e. Além disso, o vínculo do perfil de faturamento ainda não foi criado diretamente com a NF-e. Por isso, o vencimento <u>só pode ser calculado no momento em que a NF-e é faturada</u>. Lembrando que o perfil de faturamento deve sempre ser atrelado ao **DESTINATÁRIO** da NF-e.

---

# 3️⃣ TELA DE FATURAS

* A tela de listagem de faturas ganhou cores nos botões, permitindo a rápida identificação das ações, como demonstrado na imagem abaixo.
  * A ordenação das faturas ficou da forma correta.
  * O botão **CANCELAR**, existente na listagem e no formulário, permite cancelamento de faturas **CADASTRADAS* também.

![](image8.png)

* A tela de edição de faturas teve uma modificação drástica, criando uma otimização de espaço e uma identificação clara das informações. Abaixo, segue o **ANTES** e o **DEPOIS** da tela:

<h2><span style="color:red;">ANTES</span></h2>

![](image9.png)

<h2><span style="color:green;">DEPOIS</span></h2>

![](image10.png)

* A seguir, detalharei algumas mudanças ocorridas visualmente na tela:

![](image11.png)

1. Quando a fatura possuir uma ou mais parcelas registradas, os campos de **CARTEIRA**, **FORMA DE PAGAMENTO**, **PARCELAS**, **A CADA** e **PERÍODO** serão <u>desativados</u>, impedindo a edição dos mesmos. Este procedimento acontecerá para prevenir que o usuário gere parcelas de uma determinada carteira e forma de pagamento, porém antes de emitir o usuário altere a carteira e a forma de pagamento da fatura em si. Para editar estes campos, basta limpar as parcelas da tela e gerá-las novamente.
2. Os dados de **CENTRO DE CUSTOS** e **OPERAÇÃO** <u>ainda são utilizados na pesquisa de documentos</u>, porém eles estão localizados no lado de fora da fatura porque as informações preenchidas neste campo <u>são levadas para a movimentação financeira também</u>. Neste sentido, significa que ao preencher esses campos, o financeiro visualiza-os na movimentação posteriormente.
3. Além do CT-e e da Minuta, a **NF-E** é um novo documento que pode ser faturado, contanto que ela tenha sido emitida pelo módulo **FISCAL -> NF-E**. Neste caso, o **CLIENTE** marcado na fatura será o **DESTINATÁRIO** marcado na NF-e.
4. Para que haja mais espaço, você pode maximizar/minimizar os filtros de documentos em tela. Por padrão, em uma fatura **CADASTRADA**, os filtros são exibidos em tela automaticamente. Já faturas de outros status, os filtros são minimizados, mostrando mais documentos na tela de listagem.
5. Agora, todos os documentos possuem um link para abertura do documento.
6. Há uma aba adicional que permite a inserção/remoção de documentos anexos à fatura. Estes documentos <u>não são enviados junto no e-mail</u>, porém eles são disponibilizados no portal da **FATURA WEB**, caso eles sejam determinados como arquivos públicos.
7. O botão de **GERAR PARCELAS** foi movimentado para dentro da listagem das parcelas, e o botão **SALVAR** é liberado desde o momento da criação da fatura. Sempre que uma fatura não possuir parcelas, ao salvar, o sistema irá gerar parcelas <u>automaticamente</u>. Caso você clique no botão **GERAR PARCELAS**, o sistema irá remover as parcelas existentes e criar novas.
8. A quantidade de CT-es e Minutas é exibido de forma individual, em vez de aglutinado em um só contador.
9. O botão de **FATURA WEB** foi movimentado para o rodapé da janela.

---

# 4️⃣ NOVAS FUNCIONALIDADES NO FATURA WEB

* Na tela de **FATURA WEB**, é possível realizar o *download* de NF-es emitidas e faturadas, da mesma forma que CT-e e NFS-es. No caso de NF-es, um arquivo zipado contendo o DACTE e o XML são baixados automaticamente ao clicar no botão indicado.

![](image2.png)

* Abaixo das duplicadas, é possível realizar o *download* dos documentos em anexo marcados como públicos.

![](image3.png)
