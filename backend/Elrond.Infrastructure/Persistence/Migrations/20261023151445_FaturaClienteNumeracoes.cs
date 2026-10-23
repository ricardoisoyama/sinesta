using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FaturaClienteNumeracoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Faturamento",
                table: "empresas",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Detalhe",
                table: "documentos_faturaveis",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VencimentoFimDeSemana",
                table: "clientes",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "manter");

            migrationBuilder.CreateTable(
                name: "faturas_clientes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Numero = table.Column<long>(type: "bigint", nullable: false),
                    ClienteId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Emissao = table.Column<string>(type: "text", nullable: false),
                    Vencimento = table.Column<string>(type: "text", nullable: false),
                    CentroCustoId = table.Column<string>(type: "text", nullable: false),
                    CentroCustoNome = table.Column<string>(type: "text", nullable: false),
                    PlanoContaId = table.Column<string>(type: "text", nullable: false),
                    CarteiraId = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Adicional = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Desconto = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    PesoTotal = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    IcmsTotal = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ValorNfTotal = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Situacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MovimentoId = table.Column<string>(type: "text", nullable: false),
                    CobrancaId = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    MotivoCancelamento = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Cliente = table.Column<string>(type: "jsonb", nullable: false),
                    Documentos = table.Column<string>(type: "jsonb", nullable: true),
                    Envios = table.Column<string>(type: "jsonb", nullable: true),
                    Eventos = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_faturas_clientes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "numeracoes_documentos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Serie = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Ultimo = table.Column<long>(type: "bigint", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_numeracoes_documentos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_faturas_clientes_ClienteId",
                table: "faturas_clientes",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_faturas_clientes_Emissao",
                table: "faturas_clientes",
                column: "Emissao");

            migrationBuilder.CreateIndex(
                name: "IX_faturas_clientes_EmpresaId_Numero",
                table: "faturas_clientes",
                columns: new[] { "EmpresaId", "Numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_numeracoes_documentos_EmpresaId",
                table: "numeracoes_documentos",
                column: "EmpresaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "faturas_clientes");

            migrationBuilder.DropTable(
                name: "numeracoes_documentos");

            migrationBuilder.DropColumn(
                name: "Faturamento",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "Detalhe",
                table: "documentos_faturaveis");

            migrationBuilder.DropColumn(
                name: "VencimentoFimDeSemana",
                table: "clientes");
        }
    }
}
