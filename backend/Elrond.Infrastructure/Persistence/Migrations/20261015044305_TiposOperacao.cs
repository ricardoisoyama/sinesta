using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class TiposOperacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TipoOperacaoId",
                table: "campos_operacao",
                type: "character varying(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "tipos_operacao",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Nome = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
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
                    table.PrimaryKey("PK_tipos_operacao", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tipos_operacao_EmpresaId_Ordem",
                table: "tipos_operacao",
                columns: new[] { "EmpresaId", "Ordem" });

            // Empresas que já tinham campos ganham um tipo "Geral" com todos eles (nada se perde;
            // depois é só renomear, ex.: "Transporte", e criar os outros tipos).
            migrationBuilder.Sql("""
                INSERT INTO tipos_operacao ("Id", "EmpresaId", "Nome", "Ordem", "Status", "CriadoEm", "CriadoPor", "AlteradoEm", "AlteradoPor", "InativadoEm", "InativadoPor")
                SELECT DISTINCT 'padrao-' || "EmpresaId", "EmpresaId", 'Geral', 0, 'ativo',
                       to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'Implantação', '', '', '', ''
                FROM campos_operacao
                ON CONFLICT ("Id") DO NOTHING;

                UPDATE campos_operacao SET "TipoOperacaoId" = 'padrao-' || "EmpresaId" WHERE "TipoOperacaoId" = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tipos_operacao");

            migrationBuilder.DropColumn(
                name: "TipoOperacaoId",
                table: "campos_operacao");
        }
    }
}
