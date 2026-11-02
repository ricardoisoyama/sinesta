using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ImpostosRegimeVigencia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Impostos do serviço ganham regime e início da vigência (dentro do JSON): as linhas de antes
            // ficam com os dois vazios = valem para qualquer regime, desde sempre. Nada é apagado.
            migrationBuilder.Sql("""
                UPDATE servicos SET "Impostos" = (
                    SELECT coalesce(jsonb_agg(e || jsonb_build_object(
                        'Regime', coalesce(e->>'Regime', ''),
                        'VigenteDesde', coalesce(e->>'VigenteDesde', ''))), '[]'::jsonb)
                    FROM jsonb_array_elements("Impostos") e)
                WHERE "Impostos" IS NOT NULL AND jsonb_typeof("Impostos") = 'array' AND jsonb_array_length("Impostos") > 0;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
