using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FinanceiroAprovacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TipoMovimento",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "carteiras",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Banco = table.Column<string>(type: "text", nullable: false),
                    Agencia = table.Column<string>(type: "text", nullable: false),
                    Conta = table.Column<string>(type: "text", nullable: false),
                    SaldoInicial = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    SaldoInicialEm = table.Column<string>(type: "text", nullable: false),
                    Cor = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_carteiras", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "extrato_linhas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    CarteiraId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Fitid = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Data = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Memo = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    MovimentoId = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_extrato_linhas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "movimentos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    EmpresaId = table.Column<string>(type: "text", nullable: false),
                    ParceiroId = table.Column<string>(type: "text", nullable: false),
                    ParceiroNome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Descricao = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    PlanoContaId = table.Column<string>(type: "text", nullable: false),
                    CentroCustoId = table.Column<string>(type: "text", nullable: false),
                    Documento = table.Column<string>(type: "text", nullable: false),
                    Competencia = table.Column<string>(type: "text", nullable: false),
                    Vencimento = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Desconto = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Juros = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Multa = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    PagoEm = table.Column<string>(type: "text", nullable: false),
                    ValorPago = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    CarteiraId = table.Column<string>(type: "text", nullable: false),
                    FormaPagamento = table.Column<string>(type: "text", nullable: false),
                    Parcela = table.Column<int>(type: "integer", nullable: false),
                    TotalParcelas = table.Column<int>(type: "integer", nullable: false),
                    GrupoId = table.Column<string>(type: "text", nullable: false),
                    Origem = table.Column<string>(type: "text", nullable: false),
                    OrigemId = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: false),
                    Cancelado = table.Column<bool>(type: "boolean", nullable: false),
                    Aprovacao = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    RegraId = table.Column<string>(type: "text", nullable: false),
                    ReprovadoPor = table.Column<string>(type: "text", nullable: false),
                    ReprovadoEm = table.Column<string>(type: "text", nullable: false),
                    MotivoReprovacao = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Aprovacoes = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movimentos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "regras_conciliacao",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Padrao = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    ParceiroNome = table.Column<string>(type: "text", nullable: false),
                    PlanoContaId = table.Column<string>(type: "text", nullable: false),
                    CentroCustoId = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: false),
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
                    table.PrimaryKey("PK_regras_conciliacao", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_extrato_linhas_CarteiraId_Fitid",
                table: "extrato_linhas",
                columns: new[] { "CarteiraId", "Fitid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_extrato_linhas_MovimentoId",
                table: "extrato_linhas",
                column: "MovimentoId");

            migrationBuilder.CreateIndex(
                name: "IX_movimentos_Aprovacao",
                table: "movimentos",
                column: "Aprovacao");

            migrationBuilder.CreateIndex(
                name: "IX_movimentos_GrupoId",
                table: "movimentos",
                column: "GrupoId");

            migrationBuilder.CreateIndex(
                name: "IX_movimentos_Vencimento",
                table: "movimentos",
                column: "Vencimento");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "carteiras");

            migrationBuilder.DropTable(
                name: "extrato_linhas");

            migrationBuilder.DropTable(
                name: "movimentos");

            migrationBuilder.DropTable(
                name: "regras_conciliacao");

            migrationBuilder.DropColumn(
                name: "TipoMovimento",
                table: "regras_aprovacao");
        }
    }
}
