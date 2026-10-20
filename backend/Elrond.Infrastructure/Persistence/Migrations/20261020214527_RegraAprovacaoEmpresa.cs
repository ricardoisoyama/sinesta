using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RegraAprovacaoEmpresa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmpresaId",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmpresaId",
                table: "regras_aprovacao");
        }
    }
}
