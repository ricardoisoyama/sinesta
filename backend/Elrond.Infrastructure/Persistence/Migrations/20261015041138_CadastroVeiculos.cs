using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CadastroVeiculos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "veiculos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PlacaTracao = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlacaReboque = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Renavam = table.Column<string>(type: "text", nullable: false),
                    Chassi = table.Column<string>(type: "text", nullable: false),
                    Antt = table.Column<string>(type: "text", nullable: false),
                    TipoVeiculo = table.Column<string>(type: "text", nullable: false),
                    TipoCarroceria = table.Column<string>(type: "text", nullable: false),
                    Tecnologia = table.Column<string>(type: "text", nullable: false),
                    TravaQuintaRoda = table.Column<string>(type: "text", nullable: false),
                    Blindado = table.Column<string>(type: "text", nullable: false),
                    Marca = table.Column<string>(type: "text", nullable: false),
                    Modelo = table.Column<string>(type: "text", nullable: false),
                    Cor = table.Column<string>(type: "text", nullable: false),
                    Perfil = table.Column<string>(type: "text", nullable: false),
                    CpfCnpj = table.Column<string>(type: "text", nullable: false),
                    NomeProprietario = table.Column<string>(type: "text", nullable: false),
                    DataNascimento = table.Column<string>(type: "text", nullable: false),
                    Rg = table.Column<string>(type: "text", nullable: false),
                    UfRg = table.Column<string>(type: "text", nullable: false),
                    NomeMae = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_veiculos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_veiculos_PlacaTracao",
                table: "veiculos",
                column: "PlacaTracao");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "veiculos");
        }
    }
}
