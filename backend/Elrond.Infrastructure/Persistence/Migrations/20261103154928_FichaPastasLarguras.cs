using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FichaPastasLarguras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LarguraItem",
                table: "ficha_grupos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PastaId",
                table: "ficha_grupos",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Largura",
                table: "ficha_colunas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ficha_pastas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PaiId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false, defaultValue: ""),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ficha_pastas", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ficha_pastas");

            migrationBuilder.DropColumn(
                name: "LarguraItem",
                table: "ficha_grupos");

            migrationBuilder.DropColumn(
                name: "PastaId",
                table: "ficha_grupos");

            migrationBuilder.DropColumn(
                name: "Largura",
                table: "ficha_colunas");
        }
    }
}
