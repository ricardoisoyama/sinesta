using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnderecoBancoFuncionario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Banco",
                table: "usuarios",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cidade",
                table: "usuarios",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Endereco",
                table: "usuarios",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Banco",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "Cidade",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "Endereco",
                table: "usuarios");
        }
    }
}
