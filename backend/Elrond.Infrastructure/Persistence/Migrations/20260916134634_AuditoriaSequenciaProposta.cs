using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AuditoriaSequenciaProposta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auditoria",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Em = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    UsuarioId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    UsuarioNome = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Acao = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Entidade = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    EntidadeId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Descricao = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                    Alteracoes = table.Column<string>(type: "jsonb", nullable: false),
                    Ip = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditoria", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_auditoria_Em",
                table: "auditoria",
                column: "Em");

            migrationBuilder.CreateIndex(
                name: "IX_auditoria_Entidade_EntidadeId",
                table: "auditoria",
                columns: new[] { "Entidade", "EntidadeId" });

            migrationBuilder.CreateIndex(
                name: "IX_auditoria_UsuarioId",
                table: "auditoria",
                column: "UsuarioId");

            // Numeração da proposta por sequência do banco (nunca repete, mesmo em paralelo).
            // Começa do maior número já existente + 1, para não colidir com PROP-000N antigas.
            migrationBuilder.Sql(@"
CREATE SEQUENCE IF NOT EXISTS propostas_numero_seq;
SELECT setval(
    'propostas_numero_seq',
    COALESCE((SELECT MAX(NULLIF(regexp_replace(""Numero"", '\D', '', 'g'), '')::bigint) FROM propostas), 0) + 1,
    false);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS propostas_numero_seq;");
            migrationBuilder.DropTable(
                name: "auditoria");
        }
    }
}
