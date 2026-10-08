using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CrmPersistente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "funis",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    HorasAlerta = table.Column<int>(type: "integer", nullable: false),
                    CorCard = table.Column<string>(type: "text", nullable: false),
                    CamposCustomizados = table.Column<string>(type: "jsonb", nullable: true),
                    Etapas = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_funis", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "oportunidades",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    FunilId = table.Column<string>(type: "text", nullable: false),
                    EtapaId = table.Column<string>(type: "text", nullable: false),
                    Cliente = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ClienteId = table.Column<string>(type: "text", nullable: false),
                    Cnpj = table.Column<string>(type: "text", nullable: false),
                    Contato = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PerfilComprador = table.Column<string>(type: "text", nullable: false),
                    DecisorNome = table.Column<string>(type: "text", nullable: false),
                    DecisorTelefone = table.Column<string>(type: "text", nullable: false),
                    DecisorEmail = table.Column<string>(type: "text", nullable: false),
                    Servico = table.Column<string>(type: "text", nullable: false),
                    ValorEstimado = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    PropostaNumero = table.Column<string>(type: "text", nullable: false),
                    Recorrencia = table.Column<string>(type: "text", nullable: false),
                    Origem = table.Column<string>(type: "text", nullable: false),
                    Responsavel = table.Column<string>(type: "text", nullable: false),
                    VendedorId = table.Column<string>(type: "text", nullable: false),
                    EntrouNaEtapaEm = table.Column<string>(type: "text", nullable: false),
                    ProximaAcao = table.Column<string>(type: "text", nullable: false),
                    ProximaAcaoEm = table.Column<string>(type: "text", nullable: false),
                    ProximaAcaoDetalhe = table.Column<string>(type: "text", nullable: false),
                    MotivoPerda = table.Column<string>(type: "text", nullable: false),
                    Anotacoes = table.Column<string>(type: "jsonb", nullable: true),
                    CamposValores = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_oportunidades", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_oportunidades_FunilId",
                table: "oportunidades",
                column: "FunilId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "funis");

            migrationBuilder.DropTable(
                name: "oportunidades");
        }
    }
}
