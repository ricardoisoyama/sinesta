using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AlcadaAprovacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Aprovacoes",
                table: "propostas",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Justificativa",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "PrecoOriginal",
                table: "propostas",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "RegraId",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "regras_aprovacao",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Base = table.Column<string>(type: "text", nullable: false),
                    De = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Ate = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Aprovadores = table.Column<List<string>>(type: "text[]", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_regras_aprovacao", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "Aprovacoes",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "Justificativa",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "PrecoOriginal",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "RegraId",
                table: "propostas");
        }
    }
}
