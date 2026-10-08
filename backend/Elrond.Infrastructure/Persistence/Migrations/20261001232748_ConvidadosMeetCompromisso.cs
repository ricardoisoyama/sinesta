using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConvidadosMeetCompromisso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ComMeet",
                table: "compromissos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<List<string>>(
                name: "Convidados",
                table: "compromissos",
                type: "text[]",
                nullable: false,
                // Lista vazia para os compromissos que já existem (coluna obrigatória, sem perder dados).
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<string>(
                name: "LinkReuniao",
                table: "compromissos",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ComMeet",
                table: "compromissos");

            migrationBuilder.DropColumn(
                name: "Convidados",
                table: "compromissos");

            migrationBuilder.DropColumn(
                name: "LinkReuniao",
                table: "compromissos");
        }
    }
}
