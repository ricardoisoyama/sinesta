using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExtratoVariosLancamentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "MovimentoIds",
                table: "extrato_linhas",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            // Linhas já conciliadas: a lista começa com o lançamento que elas têm.
            migrationBuilder.Sql(@"UPDATE extrato_linhas SET ""MovimentoIds"" = ARRAY[""MovimentoId""] WHERE ""MovimentoId"" <> '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MovimentoIds",
                table: "extrato_linhas");
        }
    }
}
