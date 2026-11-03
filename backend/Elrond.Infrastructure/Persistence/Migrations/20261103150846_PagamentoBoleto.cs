using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PagamentoBoleto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Beneficiario",
                table: "pagamentos_bancarios",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CodigoBarras",
                table: "pagamentos_bancarios",
                type: "character varying(48)",
                maxLength: 48,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Forma",
                table: "pagamentos_bancarios",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "pix");

            migrationBuilder.AddColumn<string>(
                name: "VencimentoBoleto",
                table: "pagamentos_bancarios",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Beneficiario",
                table: "pagamentos_bancarios");

            migrationBuilder.DropColumn(
                name: "CodigoBarras",
                table: "pagamentos_bancarios");

            migrationBuilder.DropColumn(
                name: "Forma",
                table: "pagamentos_bancarios");

            migrationBuilder.DropColumn(
                name: "VencimentoBoleto",
                table: "pagamentos_bancarios");
        }
    }
}
