using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgendaCompromissos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "compromissos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Titulo = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Inicio = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Fim = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    DiaInteiro = table.Column<bool>(type: "boolean", nullable: false),
                    ResponsavelId = table.Column<string>(type: "text", nullable: false),
                    ResponsavelNome = table.Column<string>(type: "text", nullable: false),
                    ClienteId = table.Column<string>(type: "text", nullable: false),
                    ClienteNome = table.Column<string>(type: "text", nullable: false),
                    OportunidadeId = table.Column<string>(type: "text", nullable: false),
                    Local = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Concluido = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_compromissos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_compromissos_Inicio",
                table: "compromissos",
                column: "Inicio");

            migrationBuilder.CreateIndex(
                name: "IX_compromissos_ResponsavelId",
                table: "compromissos",
                column: "ResponsavelId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "compromissos");
        }
    }
}
