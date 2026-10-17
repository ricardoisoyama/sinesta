using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AvisoBancoApolicesAdValorem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvisoRegistradoEm",
                table: "integracoes_bancarias",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AvisoToken",
                table: "integracoes_bancarias",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Apolices",
                table: "fornecedores",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Seguradora",
                table: "fornecedores",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AvisoEm",
                table: "cobrancas_bancarias",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ConfirmadaEm",
                table: "cobrancas_bancarias",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ConfirmadaPor",
                table: "cobrancas_bancarias",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PagaEm",
                table: "cobrancas_bancarias",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CampoBase",
                table: "campos_operacao",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CampoDestino",
                table: "campos_operacao",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CampoOrigem",
                table: "campos_operacao",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Seguro",
                table: "campos_operacao",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvisoRegistradoEm",
                table: "integracoes_bancarias");

            migrationBuilder.DropColumn(
                name: "AvisoToken",
                table: "integracoes_bancarias");

            migrationBuilder.DropColumn(
                name: "Apolices",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Seguradora",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "AvisoEm",
                table: "cobrancas_bancarias");

            migrationBuilder.DropColumn(
                name: "ConfirmadaEm",
                table: "cobrancas_bancarias");

            migrationBuilder.DropColumn(
                name: "ConfirmadaPor",
                table: "cobrancas_bancarias");

            migrationBuilder.DropColumn(
                name: "PagaEm",
                table: "cobrancas_bancarias");

            migrationBuilder.DropColumn(
                name: "CampoBase",
                table: "campos_operacao");

            migrationBuilder.DropColumn(
                name: "CampoDestino",
                table: "campos_operacao");

            migrationBuilder.DropColumn(
                name: "CampoOrigem",
                table: "campos_operacao");

            migrationBuilder.DropColumn(
                name: "Seguro",
                table: "campos_operacao");
        }
    }
}
