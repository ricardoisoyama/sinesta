using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ContratosFaturamentoProjecao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "contratos_numero_seq");

            migrationBuilder.AddColumn<int>(
                name: "ContratoDigitos",
                table: "empresas",
                type: "integer",
                nullable: false,
                defaultValue: 4);

            migrationBuilder.AddColumn<string>(
                name: "ContratoPrefixo",
                table: "empresas",
                type: "character varying(15)",
                maxLength: 15,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "cenarios_projecao",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Hipoteses = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cenarios_projecao", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "contrato_numeracao",
                columns: table => new
                {
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Ultimo = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contrato_numeracao", x => x.EmpresaId);
                });

            migrationBuilder.CreateTable(
                name: "contratos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Numero = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    EmpresaId = table.Column<string>(type: "text", nullable: false),
                    ClienteId = table.Column<string>(type: "text", nullable: false),
                    ClienteNome = table.Column<string>(type: "text", nullable: false),
                    ClienteDocumento = table.Column<string>(type: "text", nullable: false),
                    Contato = table.Column<string>(type: "text", nullable: false),
                    ModeloId = table.Column<string>(type: "text", nullable: false),
                    TipoOperacao = table.Column<string>(type: "text", nullable: false),
                    Modalidade = table.Column<string>(type: "text", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    Inicio = table.Column<string>(type: "text", nullable: false),
                    Fim = table.Column<string>(type: "text", nullable: false),
                    LocalServico = table.Column<string>(type: "text", nullable: false),
                    PropostaId = table.Column<string>(type: "text", nullable: false),
                    PropostaNumero = table.Column<string>(type: "text", nullable: false),
                    ServicoId = table.Column<string>(type: "text", nullable: false),
                    TextoAdicionalNota = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Caracteristicas = table.Column<string>(type: "jsonb", nullable: true),
                    Componentes = table.Column<string>(type: "jsonb", nullable: true),
                    Condicoes = table.Column<string>(type: "jsonb", nullable: false),
                    Documentos = table.Column<string>(type: "jsonb", nullable: true),
                    Escopo = table.Column<string>(type: "jsonb", nullable: true),
                    Eventos = table.Column<string>(type: "jsonb", nullable: true),
                    Extras = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contratos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "faturas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Chave = table.Column<string>(type: "text", nullable: false),
                    ContratoId = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "text", nullable: false),
                    Avulsa = table.Column<bool>(type: "boolean", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: false),
                    Competencia = table.Column<string>(type: "text", nullable: false),
                    Referencia = table.Column<string>(type: "text", nullable: false),
                    Vencimento = table.Column<string>(type: "text", nullable: false),
                    Previsto = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Descontos = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ExtrasFora = table.Column<List<string>>(type: "text[]", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    Nf = table.Column<string>(type: "text", nullable: false),
                    Boleto = table.Column<string>(type: "text", nullable: false),
                    RecebidaEm = table.Column<string>(type: "text", nullable: false),
                    Motivo = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Composicao = table.Column<string>(type: "jsonb", nullable: true),
                    Documentos = table.Column<string>(type: "jsonb", nullable: true),
                    Extras = table.Column<string>(type: "jsonb", nullable: true),
                    Versoes = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_faturas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "modelos_contrato",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    TipoOperacao = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: false),
                    ServicoId = table.Column<string>(type: "text", nullable: false),
                    Agrupamento = table.Column<string>(type: "text", nullable: false),
                    Fechamento = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Campos = table.Column<string>(type: "jsonb", nullable: true),
                    Componentes = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_modelos_contrato", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_contratos_ClienteId",
                table: "contratos",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_contratos_Numero",
                table: "contratos",
                column: "Numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_faturas_Competencia",
                table: "faturas",
                column: "Competencia");

            migrationBuilder.CreateIndex(
                name: "IX_faturas_ContratoId_Chave",
                table: "faturas",
                columns: new[] { "ContratoId", "Chave" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cenarios_projecao");

            migrationBuilder.DropTable(
                name: "contrato_numeracao");

            migrationBuilder.DropTable(
                name: "contratos");

            migrationBuilder.DropTable(
                name: "faturas");

            migrationBuilder.DropTable(
                name: "modelos_contrato");

            migrationBuilder.DropColumn(
                name: "ContratoDigitos",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "ContratoPrefixo",
                table: "empresas");

            migrationBuilder.DropSequence(
                name: "contratos_numero_seq");
        }
    }
}
