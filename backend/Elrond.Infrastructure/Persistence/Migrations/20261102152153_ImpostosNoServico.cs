using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ImpostosNoServico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Impostos",
                table: "servicos",
                type: "jsonb",
                nullable: true);

            // Serviços já cadastrados: sem impostos (o Pricing segue com os da empresa até cadastrar).
            migrationBuilder.Sql("UPDATE servicos SET \"Impostos\" = '[]'::jsonb WHERE \"Impostos\" IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Impostos",
                table: "servicos");
        }
    }
}
