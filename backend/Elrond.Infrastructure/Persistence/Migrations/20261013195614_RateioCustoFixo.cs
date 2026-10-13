using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RateioCustoFixo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Rateio",
                table: "custos_fixos",
                type: "jsonb",
                nullable: true);

            // Despesas que já existem: sem rateio (continuam inteiras na empresa que paga).
            migrationBuilder.Sql("""UPDATE custos_fixos SET "Rateio" = '[]'::jsonb WHERE "Rateio" IS NULL;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Rateio",
                table: "custos_fixos");
        }
    }
}
