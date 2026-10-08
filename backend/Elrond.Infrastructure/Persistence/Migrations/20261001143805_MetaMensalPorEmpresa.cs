using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MetaMensalPorEmpresa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmpresaId",
                table: "metas",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "Principal",
                table: "metas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<List<decimal>>(
                name: "ValoresMensais",
                table: "metas",
                type: "numeric(18,6)[]",
                nullable: false,
                // Metas existentes ficam com a lista vazia (valem pelo anual digitado).
                defaultValueSql: "'{}'");

            migrationBuilder.CreateIndex(
                name: "IX_metas_EmpresaId_Ano",
                table: "metas",
                columns: new[] { "EmpresaId", "Ano" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_metas_EmpresaId_Ano",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "EmpresaId",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "Principal",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "ValoresMensais",
                table: "metas");
        }
    }
}
