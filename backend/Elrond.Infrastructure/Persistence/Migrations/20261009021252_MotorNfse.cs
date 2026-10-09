using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MotorNfse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "avisos_nfse",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Provedor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RecebidoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_avisos_nfse", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "configuracoes_fiscais",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Provedor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IdEmpresaProvedor = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Ativa = table.Column<bool>(type: "boolean", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_configuracoes_fiscais", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "notas_fiscais_servico",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    EmpresaId = table.Column<string>(type: "text", nullable: false),
                    Provedor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IdEmpresaProvedor = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IdProvedor = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Ambiente = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Situacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    EtapaProvedor = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Mensagem = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Numero = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CodigoVerificacao = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SerieRps = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    NumeroRps = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TomadorNome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TomadorDocumento = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Descricao = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Competencia = table.Column<DateOnly>(type: "date", nullable: true),
                    ValorServicos = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ValorIss = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ValorRetido = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ValorLiquido = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Pedido = table.Column<string>(type: "jsonb", nullable: false),
                    OrigemTipo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    OrigemId = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CriadaPor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AtualizadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EmitidaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CanceladaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CanceladaPor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MotivoCancelamento = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ProximaConsultaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Consultas = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notas_fiscais_servico", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_avisos_nfse_RecebidoEm",
                table: "avisos_nfse",
                column: "RecebidoEm");

            migrationBuilder.CreateIndex(
                name: "IX_notas_fiscais_servico_EmpresaId_CriadaEm",
                table: "notas_fiscais_servico",
                columns: new[] { "EmpresaId", "CriadaEm" });

            migrationBuilder.CreateIndex(
                name: "IX_notas_fiscais_servico_OrigemTipo_OrigemId",
                table: "notas_fiscais_servico",
                columns: new[] { "OrigemTipo", "OrigemId" });

            migrationBuilder.CreateIndex(
                name: "IX_notas_fiscais_servico_Provedor_IdProvedor",
                table: "notas_fiscais_servico",
                columns: new[] { "Provedor", "IdProvedor" });

            migrationBuilder.CreateIndex(
                name: "IX_notas_fiscais_servico_Situacao_ProximaConsultaEm",
                table: "notas_fiscais_servico",
                columns: new[] { "Situacao", "ProximaConsultaEm" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "avisos_nfse");

            migrationBuilder.DropTable(
                name: "configuracoes_fiscais");

            migrationBuilder.DropTable(
                name: "notas_fiscais_servico");
        }
    }
}
