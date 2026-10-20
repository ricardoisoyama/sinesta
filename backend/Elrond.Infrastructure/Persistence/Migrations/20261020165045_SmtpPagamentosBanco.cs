using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SmtpPagamentosBanco : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "configuracao_smtp",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Host = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Porta = table.Column<int>(type: "integer", nullable: false),
                    Seguranca = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Usuario = table.Column<string>(type: "text", nullable: false),
                    SenhaCifrada = table.Column<byte[]>(type: "bytea", nullable: false),
                    RemetenteNome = table.Column<string>(type: "text", nullable: false),
                    RemetenteEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ResponderPara = table.Column<string>(type: "text", nullable: false),
                    EmailTeste = table.Column<string>(type: "text", nullable: false),
                    SomenteTeste = table.Column<bool>(type: "boolean", nullable: false),
                    Ativo = table.Column<bool>(type: "boolean", nullable: false),
                    TestadoEm = table.Column<string>(type: "text", nullable: false),
                    TesteOk = table.Column<bool>(type: "boolean", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_configuracao_smtp", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "emails_enviados",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Em = table.Column<string>(type: "text", nullable: false),
                    Para = table.Column<string>(type: "text", nullable: false),
                    EnviadoPara = table.Column<string>(type: "text", nullable: false),
                    Assunto = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Origem = table.Column<string>(type: "text", nullable: false),
                    OrigemId = table.Column<string>(type: "text", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    Erro = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_emails_enviados", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "pagamentos_bancarios",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    EmpresaId = table.Column<string>(type: "text", nullable: false),
                    IntegracaoId = table.Column<string>(type: "text", nullable: false),
                    Banco = table.Column<string>(type: "text", nullable: false),
                    Ambiente = table.Column<string>(type: "text", nullable: false),
                    MovimentoId = table.Column<string>(type: "text", nullable: false),
                    MovimentoNumero = table.Column<long>(type: "bigint", nullable: false),
                    FavorecidoNome = table.Column<string>(type: "text", nullable: false),
                    FavorecidoEmail = table.Column<string>(type: "text", nullable: false),
                    Chave = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Data = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: false),
                    Situacao = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SituacaoBanco = table.Column<string>(type: "text", nullable: false),
                    IdBanco = table.Column<string>(type: "text", nullable: false),
                    EndToEnd = table.Column<string>(type: "text", nullable: false),
                    Mensagem = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PagoEm = table.Column<string>(type: "text", nullable: false),
                    AvisoEm = table.Column<string>(type: "text", nullable: false),
                    ConfirmadaEm = table.Column<string>(type: "text", nullable: false),
                    ConfirmadaPor = table.Column<string>(type: "text", nullable: false),
                    EmailEm = table.Column<string>(type: "text", nullable: false),
                    EmailSituacao = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pagamentos_bancarios", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_emails_enviados_Em",
                table: "emails_enviados",
                column: "Em");

            migrationBuilder.CreateIndex(
                name: "IX_emails_enviados_Origem_OrigemId",
                table: "emails_enviados",
                columns: new[] { "Origem", "OrigemId" });

            migrationBuilder.CreateIndex(
                name: "IX_pagamentos_bancarios_IntegracaoId_IdBanco",
                table: "pagamentos_bancarios",
                columns: new[] { "IntegracaoId", "IdBanco" });

            migrationBuilder.CreateIndex(
                name: "IX_pagamentos_bancarios_MovimentoId",
                table: "pagamentos_bancarios",
                column: "MovimentoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "configuracao_smtp");

            migrationBuilder.DropTable(
                name: "emails_enviados");

            migrationBuilder.DropTable(
                name: "pagamentos_bancarios");
        }
    }
}
