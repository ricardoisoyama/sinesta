using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PagamentosRepresados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LiberadoEm",
                table: "pagamentos_bancarios",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LiberadoPor",
                table: "pagamentos_bancarios",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "RepresarPagamentos",
                table: "integracoes_bancarias",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LiberadoEm",
                table: "pagamentos_bancarios");

            migrationBuilder.DropColumn(
                name: "LiberadoPor",
                table: "pagamentos_bancarios");

            migrationBuilder.DropColumn(
                name: "RepresarPagamentos",
                table: "integracoes_bancarias");
        }
    }
}
