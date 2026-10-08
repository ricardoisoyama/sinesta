using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CompletaCamposNovosJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Campos criados depois dentro dos JSON (conta no exterior nos dados bancários; estado no
            // endereço) não existem nos registros antigos: a API devolvia null e o salvar era recusado.
            // Completa só as chaves que faltam: no "||" do jsonb vale o lado direito, então o que já
            // estava gravado fica como está.
            foreach (var tabela in new[] { "empresas", "clientes", "fornecedores", "vendedores" })
            {
                migrationBuilder.Sql($$"""
                    UPDATE {{tabela}}
                    SET "Banco" = '{"Beneficiario": "", "Swift": "", "Iban": "", "Roteamento": ""}'::jsonb || "Banco"
                    WHERE "Banco" IS NOT NULL;
                    """);
            }
            foreach (var tabela in new[] { "clientes", "fornecedores" })
            {
                migrationBuilder.Sql($$"""
                    UPDATE {{tabela}}
                    SET "Endereco" = '{"Estado": ""}'::jsonb || "Endereco"
                    WHERE "Endereco" IS NOT NULL;
                    """);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
