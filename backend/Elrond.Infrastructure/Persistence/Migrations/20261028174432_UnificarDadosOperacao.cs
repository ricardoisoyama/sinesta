using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Dados da Operação passaram a valer para todas as empresas. Tipos de operação ativos com o mesmo nome
    /// (um por empresa, ex.: três "Geral") viram um só: fica o da empresa padrão (empate: o com mais campos
    /// ativos, depois o mais antigo). Os outros e os campos deles são INATIVADOS, nada é apagado: dá para
    /// reativar na tela e as propostas antigas guardam o retrato do que foi preenchido.
    /// </summary>
    public partial class UnificarDadosOperacao : Migration
    {
        private const string Quem = "Unificação dos Dados da Operação";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nome comparado sem acento, caixa e espaços das pontas. Um único comando: os dois UPDATEs
            // enxergam a mesma classificação.
            migrationBuilder.Sql($"""
                WITH agora AS (
                    SELECT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"0Z"') AS em
                ), ranque AS (
                    SELECT t."Id",
                           row_number() OVER (
                               PARTITION BY lower(btrim(translate(t."Nome",
                                   'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
                                   'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')))
                               ORDER BY coalesce(e."Padrao", false) DESC,
                                        (SELECT count(*) FROM campos_operacao c WHERE c."TipoOperacaoId" = t."Id" AND c."Status" = 'ativo') DESC,
                                        t."CriadoEm", t."Id") AS posicao
                    FROM tipos_operacao t
                    LEFT JOIN empresas e ON e."Id" = t."EmpresaId"
                    WHERE t."Status" = 'ativo'
                ), sobra AS (
                    SELECT "Id" FROM ranque WHERE posicao > 1
                ), campos AS (
                    UPDATE campos_operacao c
                       SET "Status" = 'inativo', "AlteradoEm" = agora.em, "AlteradoPor" = '{Quem}',
                           "InativadoEm" = agora.em, "InativadoPor" = '{Quem}'
                      FROM agora
                     WHERE c."Status" = 'ativo' AND c."TipoOperacaoId" IN (SELECT "Id" FROM sobra)
                    RETURNING c."Id"
                )
                UPDATE tipos_operacao t
                   SET "Status" = 'inativo', "AlteradoEm" = agora.em, "AlteradoPor" = '{Quem}',
                       "InativadoEm" = agora.em, "InativadoPor" = '{Quem}'
                  FROM agora
                 WHERE t."Id" IN (SELECT "Id" FROM sobra);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reativa só o que esta migration inativou.
            migrationBuilder.Sql($"""
                UPDATE campos_operacao SET "Status" = 'ativo', "InativadoEm" = '', "InativadoPor" = '' WHERE "InativadoPor" = '{Quem}' AND "Status" = 'inativo';
                UPDATE tipos_operacao SET "Status" = 'ativo', "InativadoEm" = '', "InativadoPor" = '' WHERE "InativadoPor" = '{Quem}' AND "Status" = 'inativo';
                """);
        }
    }
}
