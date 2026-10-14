# Como Utilizar o Dot Notation No Envio de Faturas Por E-mail

- ID: SUP-A-603
- Caminho: 🛟 BASE DE CONHECIMENTO > FINANCEIRO > FATURAMENTO > Como Cancelar uma Fatura > Como Utilizar o Dot Notation No Envio de Faturas Por E-mail
- Fonte: https://siimp.youtrack.cloud/articles/SUP-A-603
- Anexos (não baixados): image1.png; Captura de tela 2025-03-21 095427.png; image2.png

---

## **O que é Dot Notation?**

A `Dot Notation` (notação de ponto) é uma ferramenta poderosa que permite inserir informações dinâmicas nos textos de seus e-mails. Funciona como um "marcador de posição" que será substituído por dados reais quando o e-mail for enviado.

**Explicação simples**: Pense na `Dot Notation` como **etiquetas especiais** que você coloca em um documento para que o sistema saiba onde inserir informações específicas automaticamente.

---

## **Onde posso usar?**

No menu **Empresa -\> Impressões**. Podemos cadastrar `Dot Notation` nos campos:

* Assuntos de e-mail
* Cabeçalhos de documentos
* Rodapés de documentos

![](Captura de tela 2025-03-21 095427.png){width=70%}



---

## **Como usar?**

Para usar a Dot Notation, siga este formato simples: `[[propriedade]]`

### **Exemplos práticos:**

1. **Acessando dados da própria fatura:**
   * Para mostrar o número da fatura: `[[number]]`
   * Para mostrar a data de emissão: `[[date]]`
   * Para mostrar o valor total: `[[total]]`

![](image1.png){width=70%}



2. **Acessando dados relacionados (CTEs, documentos ou itens):**
   * Para mostrar o número do primeiro CTE: `[[ctes.first.number]]`
   * Para juntar todos os números de CTE separados por vírgula: `[[ctes.*.number.join]]`
   * Para mostrar o nome do proprietário: `[[wallet.owner.name]]`
   * Para mostrar o ID do último documento: `[[documents.last.id]]`

![](image2.png)



---

## **Funções disponíveis**

Você pode aplicar as seguintes funções para tornar seus dados ainda mais úteis:

| Função | O que faz | Exemplo |
| --- | --- | --- |
| count | Conta o número de itens | `\[\[ctes.count\]\]` |
| sum | Soma valores | `\[\[items.*.value.sum\]\]` |
| min | Mostra o valor mínimo | `\[\[payments.*.amount.min\]\]` |
| max | Mostra o valor máximo | `\[\[payments.*.amount.max\]\]` |
| avg | Calcula a média | `\[\[items.*.price.avg\]\]` |
| median | Calcula o valor mediano | `\[\[items.*.price.median\]\]` |
| first | Pega o primeiro item | `\[\[ctes.first.date\]\]` |
| last | Pega o último item | `\[\[documents.last.id\]\]` |
| isEmpty | Verifica se está vazio | `\[\[notes.isEmpty\]\]` |
| isNotEmpty | Verifica se não está vazio | `\[\[documents.isNotEmpty\]\]` |
| join | Une valores com separador | `\[\[ctes.*.number.join\]\]` |
| joinE | Une valores com "e" no final | `\[\[products.*.name.joinE\]\]` |

---

## **Dicas importantes**

1. **Insira uma propriedade por vez**
   * Correto: `[[ctes.first.number]]`
   * Incorreto: `[[ctes.first.*]]` ❌
2. **Na dúvida sobre qual propriedade usar?**
   * As propriedades disponíveis dependem dos dados da sua fatura e dos documentos relacionados!
   * Consulte a documentação técnica ou entre em contato com o suporte para casos específicos.

---

## **Exemplos prontos para usar**

* Assunto de e-mail: `Fatura #[[number]] - Envio automático`
* Cabeçalho: `Cliente: [[client.name]] | Data: [[date]] | Total: R$ [[total]]`
* Rodapé: `Esta fatura contém [[ctes.count]] conhecimentos de transporte`
* Verificação condicional: `Status: [[payments.isEmpty]] ? "Pagamento pendente" : "Pagamento recebido"`

---

Com a `Dot Notation`, é possível personalizar completamente seus *e-mails* para que contenham exatamente as informações necessárias, de forma automática e organizada!
