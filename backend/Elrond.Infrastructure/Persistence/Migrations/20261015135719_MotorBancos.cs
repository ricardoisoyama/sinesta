using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MotorBancos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cobrancas_bancarias",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    IntegracaoId = table.Column<string>(type: "text", nullable: false),
                    Banco = table.Column<string>(type: "text", nullable: false),
                    Ambiente = table.Column<string>(type: "text", nullable: false),
                    OrigemTipo = table.Column<string>(type: "text", nullable: false),
                    OrigemId = table.Column<string>(type: "text", nullable: false),
                    OrigemParcelaId = table.Column<string>(type: "text", nullable: false),
                    OrigemDescricao = table.Column<string>(type: "text", nullable: false),
                    SeuNumero = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    IdBanco = table.Column<string>(type: "text", nullable: false),
                    NossoNumero = table.Column<string>(type: "text", nullable: false),
                    LinhaDigitavel = table.Column<string>(type: "text", nullable: false),
                    CodigoBarras = table.Column<string>(type: "text", nullable: false),
                    PixCopiaECola = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Vencimento = table.Column<string>(type: "text", nullable: false),
                    PagadorNome = table.Column<string>(type: "text", nullable: false),
                    PagadorDocumento = table.Column<string>(type: "text", nullable: false),
                    Situacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SituacaoBanco = table.Column<string>(type: "text", nullable: false),
                    Mensagem = table.Column<string>(type: "text", nullable: false),
                    ValorRecebido = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    RecebidaEm = table.Column<string>(type: "text", nullable: false),
                    RecebidaPor = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cobrancas_bancarias", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "integracoes_bancarias",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Banco = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Ambiente = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ContaCorrente = table.Column<string>(type: "text", nullable: false),
                    ClientId = table.Column<string>(type: "text", nullable: false),
                    SegredoCifrado = table.Column<byte[]>(type: "bytea", nullable: false),
                    CertificadoCifrado = table.Column<byte[]>(type: "bytea", nullable: false),
                    ChaveCifrada = table.Column<byte[]>(type: "bytea", nullable: false),
                    CertificadoValidoAte = table.Column<string>(type: "text", nullable: false),
                    Recursos = table.Column<List<string>>(type: "text[]", nullable: false),
                    Ativa = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_integracoes_bancarias", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cobrancas_bancarias_EmpresaId_SeuNumero",
                table: "cobrancas_bancarias",
                columns: new[] { "EmpresaId", "SeuNumero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cobrancas_bancarias_IdBanco",
                table: "cobrancas_bancarias",
                column: "IdBanco");

            migrationBuilder.CreateIndex(
                name: "IX_cobrancas_bancarias_OrigemTipo_OrigemId",
                table: "cobrancas_bancarias",
                columns: new[] { "OrigemTipo", "OrigemId" });

            migrationBuilder.CreateIndex(
                name: "IX_integracoes_bancarias_EmpresaId_Banco",
                table: "integracoes_bancarias",
                columns: new[] { "EmpresaId", "Banco" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cobrancas_bancarias");

            migrationBuilder.DropTable(
                name: "integracoes_bancarias");
        }
    }
}
