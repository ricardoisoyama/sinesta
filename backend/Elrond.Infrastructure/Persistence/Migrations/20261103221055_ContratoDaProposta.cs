using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ContratoDaProposta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Modalidade",
                table: "propostas",
                type: "character varying(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "avulso");

            migrationBuilder.AddColumn<string>(
                name: "VigenciaFim",
                table: "propostas",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VigenciaInicio",
                table: "propostas",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Clausulas",
                table: "modelos_contrato",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CondicoesPadrao",
                table: "modelos_contrato",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Clausulas",
                table: "contratos",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Modalidade",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "VigenciaFim",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "VigenciaInicio",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "Clausulas",
                table: "modelos_contrato");

            migrationBuilder.DropColumn(
                name: "CondicoesPadrao",
                table: "modelos_contrato");

            migrationBuilder.DropColumn(
                name: "Clausulas",
                table: "contratos");
        }
    }
}
