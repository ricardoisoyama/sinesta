using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ParametrizacaoFichaTecnica : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "campos_operacao",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Chave = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Efeito = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Obrigatorio = table.Column<bool>(type: "boolean", nullable: false),
                    Largura = table.Column<int>(type: "integer", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Opcoes = table.Column<List<string>>(type: "text[]", nullable: false),
                    Cadastro = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Ajuda = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
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
                    table.PrimaryKey("PK_campos_operacao", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ficha_colunas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Chave = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CompoeTotal = table.Column<bool>(type: "boolean", nullable: false),
                    Base = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Formula = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Opcoes = table.Column<List<string>>(type: "text[]", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_ficha_colunas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ficha_valores",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    FichaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    ColunaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Numero = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: true),
                    Texto = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ficha_valores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fichas_tecnicas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Nome = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_fichas_tecnicas", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_campos_operacao_EmpresaId_Ordem",
                table: "campos_operacao",
                columns: new[] { "EmpresaId", "Ordem" });

            migrationBuilder.CreateIndex(
                name: "IX_ficha_colunas_EmpresaId_Ordem",
                table: "ficha_colunas",
                columns: new[] { "EmpresaId", "Ordem" });

            migrationBuilder.CreateIndex(
                name: "IX_ficha_valores_ColunaId",
                table: "ficha_valores",
                column: "ColunaId");

            migrationBuilder.CreateIndex(
                name: "IX_ficha_valores_FichaId_ColunaId",
                table: "ficha_valores",
                columns: new[] { "FichaId", "ColunaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fichas_tecnicas_EmpresaId_Ordem",
                table: "fichas_tecnicas",
                columns: new[] { "EmpresaId", "Ordem" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "campos_operacao");

            migrationBuilder.DropTable(
                name: "ficha_colunas");

            migrationBuilder.DropTable(
                name: "ficha_valores");

            migrationBuilder.DropTable(
                name: "fichas_tecnicas");
        }
    }
}
