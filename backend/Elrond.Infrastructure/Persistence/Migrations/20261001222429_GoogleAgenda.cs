using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GoogleAgenda : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "conexoes_google",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UsuarioId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    RefreshTokenCifrado = table.Column<string>(type: "text", nullable: false),
                    AccessTokenCifrado = table.Column<string>(type: "text", nullable: false),
                    AccessTokenExpiraEm = table.Column<string>(type: "text", nullable: false),
                    ConectadoEm = table.Column<string>(type: "text", nullable: false),
                    UltimaSincronia = table.Column<string>(type: "text", nullable: false),
                    UltimoErro = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_conexoes_google", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vinculos_google",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UsuarioId = table.Column<string>(type: "text", nullable: false),
                    Origem = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OrigemId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    GoogleEventId = table.Column<string>(type: "text", nullable: false),
                    Assinatura = table.Column<string>(type: "text", nullable: false),
                    AtualizadoEm = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vinculos_google", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_conexoes_google_UsuarioId",
                table: "conexoes_google",
                column: "UsuarioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vinculos_google_GoogleEventId",
                table: "vinculos_google",
                column: "GoogleEventId");

            migrationBuilder.CreateIndex(
                name: "IX_vinculos_google_Origem_OrigemId",
                table: "vinculos_google",
                columns: new[] { "Origem", "OrigemId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "conexoes_google");

            migrationBuilder.DropTable(
                name: "vinculos_google");
        }
    }
}
