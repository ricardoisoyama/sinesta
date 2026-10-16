using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class IntegracaoCarteiraRegrasBoleto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Boleto",
                table: "integracoes_bancarias",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CarteiraId",
                table: "integracoes_bancarias",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Boleto",
                table: "integracoes_bancarias");

            migrationBuilder.DropColumn(
                name: "CarteiraId",
                table: "integracoes_bancarias");
        }
    }
}
