using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CadastrosRapidosAnexos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UsuarioId",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BasePercentual",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "nf");

            migrationBuilder.AddColumn<string>(
                name: "Modo",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "valor");

            migrationBuilder.AddColumn<decimal>(
                name: "Valor",
                table: "tipos_custo",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "EnderecoExterior",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "Externo",
                table: "fornecedores",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Moeda",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Pais",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Site",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TaxId",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "MarkupMinimo",
                table: "empresas",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "FormaPagamento",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "PrazoPagamentoDias",
                table: "clientes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "anexos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Entidade = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    EntidadeId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Nome = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Tamanho = table.Column<long>(type: "bigint", nullable: false),
                    Caminho = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    EnviadoPor = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Em = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_anexos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_anexos_Entidade_EntidadeId",
                table: "anexos",
                columns: new[] { "Entidade", "EntidadeId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "anexos");

            migrationBuilder.DropColumn(
                name: "UsuarioId",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "BasePercentual",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "Modo",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "Valor",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "EnderecoExterior",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Externo",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Moeda",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Pais",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "Site",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "TaxId",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "MarkupMinimo",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "FormaPagamento",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "PrazoPagamentoDias",
                table: "clientes");
        }
    }
}
