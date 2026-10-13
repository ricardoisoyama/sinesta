using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MetasPelaMediaDoAno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "BasePreco",
                table: "metas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "media",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "mes");

            // Decisão de 13/10: as metas que já existiam também passam a dar preço pela média do ano.
            // Só muda a opção; valores e meses ficam como estão.
            migrationBuilder.Sql("""UPDATE metas SET "BasePreco" = 'media' WHERE "BasePreco" = 'mes';""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "BasePreco",
                table: "metas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "mes",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "media");
        }
    }
}
