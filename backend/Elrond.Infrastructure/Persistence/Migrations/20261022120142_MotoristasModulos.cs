using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MotoristasModulos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "configuracao_sistema",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    MenusDesligados = table.Column<List<string>>(type: "text[]", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_configuracao_sistema", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "motoristas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Cpf = table.Column<string>(type: "character varying(14)", maxLength: 14, nullable: false),
                    Rg = table.Column<string>(type: "text", nullable: false),
                    DataEmissaoRg = table.Column<string>(type: "text", nullable: false),
                    NomeMae = table.Column<string>(type: "text", nullable: false),
                    NomePai = table.Column<string>(type: "text", nullable: false),
                    DataNascimento = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Vinculo = table.Column<string>(type: "text", nullable: false),
                    NumeroCnh = table.Column<string>(type: "text", nullable: false),
                    RegistroCnh = table.Column<string>(type: "text", nullable: false),
                    CategoriaCnh = table.Column<string>(type: "text", nullable: false),
                    ValidadeCnh = table.Column<string>(type: "text", nullable: false),
                    PrimeiraHabilitacao = table.Column<string>(type: "text", nullable: false),
                    Cidade = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Endereco = table.Column<string>(type: "jsonb", nullable: true),
                    Referencias = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_motoristas", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_motoristas_Cpf",
                table: "motoristas",
                column: "Cpf");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "configuracao_sistema");

            migrationBuilder.DropTable(
                name: "motoristas");
        }
    }
}
