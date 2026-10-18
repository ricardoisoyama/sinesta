using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PendentesFaturamentoSiimp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "documentos_faturaveis",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SiimpId = table.Column<long>(type: "bigint", nullable: false),
                    Numero = table.Column<string>(type: "text", nullable: false),
                    Serie = table.Column<string>(type: "text", nullable: false),
                    Chave = table.Column<string>(type: "character varying(44)", maxLength: 44, nullable: false),
                    Situacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Motivo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    SituacaoSiimp = table.Column<int>(type: "integer", nullable: false),
                    EmpresaId = table.Column<string>(type: "text", nullable: false),
                    EmitenteCnpj = table.Column<string>(type: "text", nullable: false),
                    EmitenteNome = table.Column<string>(type: "text", nullable: false),
                    TomadorSiimpId = table.Column<long>(type: "bigint", nullable: false),
                    TomadorNome = table.Column<string>(type: "text", nullable: false),
                    TomadorDocumento = table.Column<string>(type: "text", nullable: false),
                    ClienteId = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    Emissao = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Descricao = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    NfseNumero = table.Column<string>(type: "text", nullable: false),
                    FaturaSiimp = table.Column<string>(type: "text", nullable: false),
                    FaturaId = table.Column<string>(type: "text", nullable: false),
                    LidoEm = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documentos_faturaveis", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "faturas_siimp_lidas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Numero = table.Column<long>(type: "bigint", nullable: false),
                    Situacao = table.Column<int>(type: "integer", nullable: false),
                    Documentos = table.Column<List<string>>(type: "text[]", nullable: false),
                    LidaEm = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_faturas_siimp_lidas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "pessoas_siimp_lidas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Documento = table.Column<string>(type: "text", nullable: false),
                    LidaEm = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pessoas_siimp_lidas", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_documentos_faturaveis_CriadoEm",
                table: "documentos_faturaveis",
                column: "CriadoEm");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_faturaveis_FaturaId",
                table: "documentos_faturaveis",
                column: "FaturaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "documentos_faturaveis");

            migrationBuilder.DropTable(
                name: "faturas_siimp_lidas");

            migrationBuilder.DropTable(
                name: "pessoas_siimp_lidas");
        }
    }
}
