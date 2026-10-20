using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PagamentoNoLancamento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PagamentoBancarioId",
                table: "movimentos",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Lançamentos já pagos por Pix pelo ELROND (antes deste campo) ficam marcados.
            migrationBuilder.Sql(@"UPDATE movimentos m SET ""PagamentoBancarioId"" = p.""Id""
                FROM pagamentos_bancarios p
                WHERE p.""MovimentoId"" = m.""Id"" AND p.""Situacao"" = 'pago' AND m.""PagamentoBancarioId"" = '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PagamentoBancarioId",
                table: "movimentos");
        }
    }
}
