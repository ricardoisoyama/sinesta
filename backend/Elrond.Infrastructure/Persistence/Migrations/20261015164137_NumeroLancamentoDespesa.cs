using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NumeroLancamentoDespesa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Só aditiva. Os registros que já existem recebem número pela ordem de criação (as
            // parcelas de um lançamento em sequência); depois a sequência continua do maior.
            migrationBuilder.Sql("""
                CREATE SEQUENCE IF NOT EXISTS movimentos_numero_seq;
                CREATE SEQUENCE IF NOT EXISTS custos_fixos_numero_seq;

                ALTER TABLE movimentos ADD COLUMN "Numero" bigint NOT NULL DEFAULT 0;
                WITH numerados AS (
                    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CriadoEm", "GrupoId", "Parcela", "Id") AS n FROM movimentos
                )
                UPDATE movimentos m SET "Numero" = numerados.n FROM numerados WHERE m."Id" = numerados."Id";
                SELECT setval('movimentos_numero_seq', COALESCE((SELECT MAX("Numero") FROM movimentos), 0) + 1, false);
                ALTER TABLE movimentos ALTER COLUMN "Numero" SET DEFAULT nextval('movimentos_numero_seq');

                ALTER TABLE custos_fixos ADD COLUMN "Numero" bigint NOT NULL DEFAULT 0;
                WITH numerados AS (
                    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CriadoEm", "Id") AS n FROM custos_fixos
                )
                UPDATE custos_fixos c SET "Numero" = numerados.n FROM numerados WHERE c."Id" = numerados."Id";
                SELECT setval('custos_fixos_numero_seq', COALESCE((SELECT MAX("Numero") FROM custos_fixos), 0) + 1, false);
                ALTER TABLE custos_fixos ALTER COLUMN "Numero" SET DEFAULT nextval('custos_fixos_numero_seq');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_movimentos_Numero",
                table: "movimentos",
                column: "Numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_custos_fixos_Numero",
                table: "custos_fixos",
                column: "Numero",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_movimentos_Numero",
                table: "movimentos");

            migrationBuilder.DropIndex(
                name: "IX_custos_fixos_Numero",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "Numero",
                table: "movimentos");

            migrationBuilder.DropColumn(
                name: "Numero",
                table: "custos_fixos");

            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS movimentos_numero_seq; DROP SEQUENCE IF EXISTS custos_fixos_numero_seq;");
        }
    }
}
