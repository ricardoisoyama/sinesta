# ☁️ API REST

- ID: SUP-A-383
- Caminho: 
- Fonte: https://siimp.youtrack.cloud/articles/SUP-A-383

---

# 🗒️ INTRODUÇÃO

As APIs da SIIMP começaram a ser construídas em 2018, após iniciarmos a transição de requisições de aplicações legadas de *back-end* para um projeto mais atualizado. Inicialmente, somente alguns *endpoints* foram replicados, mas com o tempo o projeto foi crescendo cada vez mais, se tornando atualmente nosso principal repositório de regras de negócio.

---

# 📚 LISTA DE APIS

Abaixo, segue uma lista contendo os *links* de todas as APIs disponíveis no sistema, com sua documentação específica de uso em cada uma delas.

* **[ABASTECIMENTOS](https://dev-lannister.emitir.me/rest/documentation/fuelsupply)**
* **[BOMBAS DE COMBUSTÍVEL](https://dev-lannister.emitir.me/rest/documentation/fuelpump)**
* **[CATEGORIZAÇÕES DE SERVIÇOS](https://dev-lannister.emitir.me/rest/documentation/service-categorization)**
* **[CLASSIFICAÇÃO DE VEÍCULOS](https://dev-lannister.emitir.me/rest/documentation/vehicle_classification)**
* **[CENTRAL DE CT-ES](https://dev-lannister.emitir.me/rest/documentation/central-cte)**
* **[CENTRAL DE NOTAS](https://dev-lannister.emitir.me/rest/documentation/nf)**
* **[CENTROS DE CUSTOS](https://dev-lannister.emitir.me/rest/documentation/costcenter)**
* **[CENTROS DE GASTOS](https://dev-lannister.emitir.me/rest/documentation/spendingcenter)**
* **[CIOTS](https://dev-lannister.emitir.me/rest/documentation/ciot)**
* **[COTAÇÕES](https://dev-lannister.emitir.me/rest/documentation/quotation)**
* **[CT-ES](https://dev-lannister.emitir.me/rest/documentation/cte)**
* **[FATURAS](https://dev-lannister.emitir.me/rest/documentation/invoice)**
* **[GESTÃO DE CONTAINER](https://dev-lannister.emitir.me/rest/documentation/terminal-stock)**
* **[MINUTAS](https://dev-lannister.emitir.me/rest/documentation/income)**
* **[MINUTAS DE AET](https://dev-lannister.emitir.me/rest/documentation/specialtransitpermit)**
* **[MINUTAS DE AGENDAMENTO](https://dev-lannister.emitir.me/rest/documentation/income-appointment)**
* **[NF-ES](https://dev-lannister.emitir.me/rest/documentation/nfe)**
* **[NFS-ES](https://dev-lannister.emitir.me/rest/documentation/nfse)**
* **[OCORRÊNCIAS](https://dev-lannister.emitir.me/rest/documentation/occurrence)**
* **[OPERAÇÕES](https://dev-lannister.emitir.me/rest/documentation/operation)**
* **[ORDENS DE COLETA](https://dev-lannister.emitir.me/rest/documentation/collection)**
* **[ORDENS DE SERVIÇO](https://dev-lannister.emitir.me/rest/documentation/serviceorder)**
* **[ORDENS DE TRANSFERÊNCIA](https://dev-lannister.emitir.me/rest/documentation/transferorder)**
* **[PAGAMENTOS DE TERCEIROS](https://dev-lannister.emitir.me/rest/documentation/payment)**
* **[PESSOAS](https://dev-lannister.emitir.me/rest/documentation/person)**
* **[PERFIS DE ACESSO](https://dev-lannister.emitir.me/rest/documentation/role)**
* **[PNEUS](https://dev-lannister.emitir.me/rest/documentation/tires)**
* **[PRODUTOS](https://dev-lannister.emitir.me/rest/documentation/product)**
* **[PROGRAMAÇÕES DE CARGA](https://dev-lannister.emitir.me/rest/documentation/process)**
* **[PROGRAMAÇÕES DE VIAGEM](https://dev-lannister.emitir.me/rest/documentation/tripprogramming)**
* **[ROMANEIOS](https://dev-lannister.emitir.me/rest/documentation/outcome)**
* **[SCT-ES](https://dev-lannister.emitir.me/rest/documentation/cargoscheduling)**
* **[SERVIÇOS](https://dev-lannister.emitir.me/rest/documentation/service)**
* **[SERVIÇOS DE NFS-ES](https://dev-lannister.emitir.me/rest/documentation/nfseservice)**
* **[TANQUES](https://dev-lannister.emitir.me/rest/documentation/fueltank)**
* **[TIPOS DE AGENDAMENTO](https://dev-lannister.emitir.me/rest/documentation/appointment-type)**
* **[USUÁRIOS](https://dev-lannister.emitir.me/rest/documentation/user)**
* **[VALE PEDÁGIOS](https://dev-lannister.emitir.me/rest/documentation/toll-voucher)**
* **[VEÍCULOS](https://dev-lannister.emitir.me/rest/documentation/vehicle)**

---

# ❓ CONSIDERAÇÕES SOBRE A API

* Todas as requisições nesta documentação são realizadas via **API REST**.
* Toda a comunicação é feita em URLs via `GET` e/ou `POST` em formato **[JSON](https://www.json.org/json-en.html)**.
* As requisições são feitas para um *subdomínio específico para cada cliente*. Isto significa que a requisição deve ser enviada para uma URL parecida com `subdominio.cliente.com.br`.
  * A configuração deste subdomínio, gerando a URL original que deverá ser considerada *é de responsabilidade da Siimp*.
  * Há também um subdomínio de homologação para testes em cada cliente, contendo uma base separada, com dados espelhados de produção até um certo período.

*Antes de realizar quaisquer testes, verifique com o nosso time qual o subdomínio e a URL de integração para os ambientes de produção e homologação. A ativação destes ambientes poderá passar por validações comerciais*.

* Cada usuário do sistema pode ser atrelado à um **TOKEN** de acesso. Este token não possui uma data de expiração fixa, mas pode ser regerado pela equipe técnica da Siimp conforme demanda do cliente. Este token deve ser enviado no cabeçalho `X-Api-Key` de todas as requisições. Segue alguns exemplos abaixo:

**CURL**

```
curl --location --request GET 'http://subdominio.cliente.com.br/endpoint' \
--header 'X-Api-Key: SEU_TOKEN_AQUI' \
--data-raw 'JSON_AQUI'
```

**PHP** *(usando Guzzle)*

```php
$client = new Client();
$request = $client->request('GET', 'http://subdominio.cliente.com.br/endpoint', [
    'X-Api-Key'     => 'SEU_TOKEN_AQUI',
    'Content-Type'  => 'application/json'
], json_encode($json, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
$content = $response->getBody()->getContents();
```

**C#** *(usando RestSharp)*

```c#
var client = new RestClient("http://subdominio.cliente.com.br/endpoint");
var request = new RestRequest(Method.GET);
request.AddHeader("X-Api-Key", "SEU_TOKEN_AQUI");
request.AddParameter("text/plain", body,  ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
Console.WriteLine(response.Content);
```

*Da mesma forma que a URL, o TOKEN deve ser solicitado junto ao time técnico da Siimp. A ativação destes tokens poderá passar por validações comerciais*.

* Todas as requisições feitas via API tem um limite máximo de *60 requisições por minuto*.

---

# 😱 TRATATIVAS DE ERROS

Existem vários tipos de erros que a API poderá reportar durante a sua utilização.

* Se o `STATUS CODE` retornar algo diferente de `200`, um erro será retornado no atributo `message`, contendo a mensagem de erro correspondente. Normalmente estes erros são de validações de *input* de dados.

```json
{
    "data": [],
    "message": "Falha na validação dos dados",
    "success": false,
    "errors": [
        "O campo cpf deve conter 11 dígitos.",
        "O campo ie free não contém um valor válido."
    ]
}
```

* Se o `STATUS CODE` retornar `200`, verifique o atributo `success`. Ele, por sua vez, poderá retornar os valores `true` ou `false`. Em caso de `false`, verifique o motivo no atributo `message`. Estes erros acontecem quando há validação dos dados, mas houve falha em alguma regra de negócio.

```json
{
    "data": [],
    "message": "Erro: Você não tem permissão para gerar CT-es à partir da Minuta!",
    "success": false,
    "errors": [
        "Erro: Você não tem permissão para gerar CT-es à partir da Minuta!"
    ],
    "total": 0
}
```

---

# 🔛 TOGGLEABLE ARRAYS

Em diversas documentações de nossas APIs, as `arrays` funcionam em **MODO TOGGLE**.

*Isso basicamente significa que, se o parâmetro de* `array` *for informado na requisição de* `/update` *(atualização)*, ***o sistema irá compará-lo aos itens já inseridos no sistema para o mesmo registro. Caso houver diferenças, o sistema exclui, altera e/ou insere de acordo com o que for informado/conferido.***

Para ilustrar esta funcionalidade, vamos dar um exemplo prático. Na rota `/operations/update`, podemos atualizar as informações de uma operação de transporte. De acordo com o `OperationModel` demonstrado na documentação, há dois parâmetros opcionais chamados `ncms` e `cfops`, ambos do tipo `array`.

Dessa forma, imagine que temos uma operação cadastrada no sistema contendo 4 intervalos de `ncms`, conforme demonstrado abaixo:

```json
{
    "id": 234,
    "name": "NOVA OPERAÇÃO",
    "owner_id": 168431,
    "xml_feature": "NovOthOp",
    "ncms": [
        {
            "id": 12,
            "from": 1111111,
            "to": 2222222,
            "description": "Primeiro intervalo"
        },
        {
            "id": 13,
            "from": 2222222,
            "to": 3333333,
            "description": "Segundo intervalo"
        },
        {
            "id": 14,
            "from": 3333333,
            "to": 4444444,
            "description": "Terceiro intervalo"
        },
        {
            "id": 15,
            "from": 4444444,
            "to": 5555555,
            "description": "Quarto intervalo"
        }
    ],
    "cfops": []
}
```

Com isso, podemos fazer algumas simulações, conforme cada ponto abaixo

## 1️⃣ REMOVENDO TODOS OS ITENS

Para remover todos os itens, basta realizar um `/update` informando o campo `cfops` com uma `array` vazia.

```json
{
    "id": 234,
    "name": "NOVA OPERAÇÃO",
    "owner_id": 168431,
    "xml_feature": "NovOthOp",
    "ncms": [],
    "cfops": []
}
```

## 2️⃣ ADICIONANDO NOVOS ITENS

Para adicionar um novo item, você deve enviar todos os itens anteriores e seus respectivos `ids`, juntamente com o novo item que você deseja adicionar. Perceba que o novo item não possui um atributo chamado `id`. Quando isso acontece, o sistema identifica que este novo item deve ser adicionado e um novo `id` deverá ser atribuído.

> ***<span style="color:red;">ATENÇÃO:</span>** O envio do* `id` *no item deve ser enviado obrigatoriamente* em todos os itens que devem ser mantidos. Se você não enviá-lo, significará que o item anterior deverá ser removido do banco de dados e um novo item como um novo `id` *deverá ser gerado.*

```json
{
    "id": 234,
    "name": "NOVA OPERAÇÃO",
    "owner_id": 168431,
    "xml_feature": "NovOthOp",
    "ncms": [
        {
            "id": 12,
            "from": 1111111,
            "to": 2222222,
            "description": "Primeiro intervalo"
        },
        {
            "id": 13,
            "from": 2222222,
            "to": 3333333,
            "description": "Segundo intervalo"
        },
        {
            "id": 14,
            "from": 3333333,
            "to": 4444444,
            "description": "Terceiro intervalo"
        },
        {
            "id": 15,
            "from": 4444444,
            "to": 5555555,
            "description": "Quarto intervalo"
        },
        {
            "from": 5555555,
            "to": 6666666,
            "description": "Quinto intervalo"
        }
    ],
    "cfops": []
}
```

## 3️⃣ MANTENDO OS MESMOS ITENS

Caso você queira manter os itens desejados sem nenhuma alteração, basta não informar o campo desejado no corpo da sua requisição, conforme exemplo abaixo:

> ***<span style="color:red;">ATENÇÃO:</span>** Se o campo for obrigatório para requisições de atualização/inserção, você então deverá enviar todos os itens com seus respectivos* `ids` *para mantê-los no banco de dados.*

```json
{
    "id": 234,
    "name": "NOVA OPERAÇÃO",
    "owner_id": 168431,
    "xml_feature": "NovOthOp"
}
```

## 4️⃣ ALTERANDO ITENS EXISTENTES

Para alterar itens existentes, basta informar o `id` do item que deseja alterar, juntamente com todas as demais informações já alteradas conforme desejado. Na situação acima, onde há 4 `ncms` cadastrados, mas só deseja-se alterar o último, então todos os outros `ncms` devem ser informados no corpo da requisição *(caso contrário, eles serão excluídos)*.

```json
{
    "id": 234,
    "name": "NOVA OPERAÇÃO",
    "owner_id": 168431,
    "xml_feature": "NovOthOp",
    "ncms": [
        {
            "id": 12,
            "from": 1111111,
            "to": 2222222,
            "description": "Primeiro intervalo"
        },
        {
            "id": 13,
            "from": 2222222,
            "to": 3333333,
            "description": "Segundo intervalo"
        },
        {
            "id": 14,
            "from": 3333333,
            "to": 4444444,
            "description": "Terceiro intervalo"
        },
        {
            "id": 15,
            "from": 4444444,
            "to": 5555555,
            "description": "Quarto intervalo - Modificando a descrição"
        }
    ],
    "cfops": []
}
```

> ***<span style="color:red;">ATENÇÃO:</span>** Algumas APIs não possuem a funcionalidade de atualização de itens* de uma `array`*, somente inserção e remoção. Isso acontece principalmente em casos de atualizações de tabelas simples, com somente dois ou três campos pivôs. Quando um atributo possuir a ausência desta funcionalidade, a documentação irá pontuá-lo em seu respectivo* `schema`*.*

> ***<span style="color:red;">ATENÇÃO:</span>** Em algumas APIs, a ordem dos itens na* `array` *importa*. Isso acontece principalmente em casos onde deve-se manter a posição exata do item, como em roteiros de entrega e ordenação de tarifas de cobrança de frete. Quando um atributo possuir esta funcionalidade, a documentação também irá pontuá-lo em seu respectivo `schema`*.*
