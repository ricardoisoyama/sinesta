using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FeriadosDiaUtil : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VencimentoFimDeSemana",
                table: "fornecedores",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "manter");

            migrationBuilder.AddColumn<string>(
                name: "VencimentoDiaUtil",
                table: "custos_fixos",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "feriados",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Data = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    TodoAno = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_feriados", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "feriados");

            migrationBuilder.DropColumn(
                name: "VencimentoFimDeSemana",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "VencimentoDiaUtil",
                table: "custos_fixos");
        }
    }
}
