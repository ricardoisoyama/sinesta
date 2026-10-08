using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ModeloPaginas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Objetivo",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "Observacao",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "Titulo",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "TributacaoTexto",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "ValidadeTexto",
                table: "modelos_proposta");

            migrationBuilder.AddColumn<string>(
                name: "Paginas",
                table: "modelos_proposta",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Paginas",
                table: "modelos_proposta");

            migrationBuilder.AddColumn<string>(
                name: "Objetivo",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Observacao",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Titulo",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TributacaoTexto",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ValidadeTexto",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
