using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class VencimentoEnderecoContaDre : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContaDre",
                table: "plano_contas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Endereco",
                table: "fornecedores",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DiaVencimento",
                table: "custos_fixos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Endereco",
                table: "clientes",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContaDre",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "Endereco",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "DiaVencimento",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "Endereco",
                table: "clientes");
        }
    }
}
