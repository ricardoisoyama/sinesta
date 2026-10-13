using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MetaBasePrecoEValorAnual : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BaseAnoAnterior",
                table: "metas",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "BasePreco",
                table: "metas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "mes");

            migrationBuilder.AddColumn<decimal>(
                name: "CrescimentoAnoAnterior",
                table: "metas",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "EntradaMeses",
                table: "metas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "valor");

            migrationBuilder.AddColumn<string>(
                name: "OrigemAnual",
                table: "metas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "valor");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BaseAnoAnterior",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "BasePreco",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "CrescimentoAnoAnterior",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "EntradaMeses",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "OrigemAnual",
                table: "metas");
        }
    }
}
