using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ServicoFiscalNfseFatura : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Fiscais",
                table: "servicos",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NfseId",
                table: "faturas",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Serviços já cadastrados: lista fiscal vazia (nunca nula).
            migrationBuilder.Sql("UPDATE servicos SET \"Fiscais\" = '[]'::jsonb WHERE \"Fiscais\" IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Fiscais",
                table: "servicos");

            migrationBuilder.DropColumn(
                name: "NfseId",
                table: "faturas");
        }
    }
}
