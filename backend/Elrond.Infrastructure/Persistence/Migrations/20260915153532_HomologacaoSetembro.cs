using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Homologação de 15/09: contatos múltiplos, dados bancários, campos comerciais de
    /// cliente/fornecedor, função do vendedor, tipo da conta do plano, ano da meta e forma
    /// de pagamento da proposta. SÓ ADICIONA colunas (nullable ou com default): nenhuma
    /// linha existente é alterada ou perdida.
    /// </summary>
    public partial class HomologacaoSetembro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Banco",
                table: "vendedores",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TipoVendedor",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FormaPagamento",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "plano_contas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Ano",
                table: "metas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Fornecedores já cadastrados recebem lista vazia (sem o default o Postgres
            // recusa a coluna NOT NULL em tabela com linhas).
            migrationBuilder.AddColumn<List<string>>(
                name: "Aprovadores",
                table: "fornecedores",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.AddColumn<string>(
                name: "Banco",
                table: "fornecedores",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CentroCustoId",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CompradorId",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Contatos",
                table: "fornecedores",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GrupoEconomico",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "LimiteCompra",
                table: "fornecedores",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "NaturezaCusto",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PlanoContaId",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Segmento",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TipoFornecimento",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Banco",
                table: "empresas",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Banco",
                table: "clientes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CentroCustoId",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Contatos",
                table: "clientes",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GrupoEconomico",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Perfil",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Segmento",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VendedorCsId",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VendedorSalesId",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VendedorSdrId",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Banco",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "TipoVendedor",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "FormaPagamento",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "Ano",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "Aprovadores",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Banco",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "CentroCustoId",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "CompradorId",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Contatos",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "GrupoEconomico",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "LimiteCompra",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "NaturezaCusto",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "PlanoContaId",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Segmento",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "TipoFornecimento",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Banco",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "Banco",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "CentroCustoId",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "Contatos",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "GrupoEconomico",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "Perfil",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "Segmento",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "VendedorCsId",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "VendedorSalesId",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "VendedorSdrId",
                table: "clientes");
        }
    }
}
