using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ValidadesCertificadoEmpresa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SimplesAnexo",
                table: "empresas",
                type: "character varying(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ValidadesProposta",
                table: "empresas",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "certificados_empresa",
                columns: table => new
                {
                    EmpresaId = table.Column<string>(type: "text", nullable: false),
                    ArquivoCifrado = table.Column<byte[]>(type: "bytea", nullable: false),
                    SenhaCifrada = table.Column<byte[]>(type: "bytea", nullable: false),
                    NomeArquivo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Titular = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Cnpj = table.Column<string>(type: "character varying(14)", maxLength: 14, nullable: false),
                    Emissor = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Impressao = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ValidoDe = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ValidoAte = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EnviadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EnviadoPor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_certificados_empresa", x => x.EmpresaId);
                    table.ForeignKey(
                        name: "FK_certificados_empresa_empresas_EmpresaId",
                        column: x => x.EmpresaId,
                        principalTable: "empresas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // As validades eram uma lista só (tela "Validades de Proposta"); passam a ser de cada
            // empresa. Cada empresa recebe as ativas de hoje, em ordem de dias. Se só existe uma,
            // ela já fica como padrão. A tabela antiga fica como está (nada é apagado).
            migrationBuilder.Sql("""
                UPDATE empresas SET "ValidadesProposta" = COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'Id', v."Id",
                            'Descricao', v."Descricao",
                            'Padrao', (SELECT count(*) FROM validades_proposta w WHERE w."Status" = 'ativo') = 1)
                        ORDER BY NULLIF(substring(v."Descricao" from '\d+'), '')::int NULLS LAST, v."Descricao")
                    FROM validades_proposta v
                    WHERE v."Status" = 'ativo'), '[]'::jsonb)
                WHERE "ValidadesProposta" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "certificados_empresa");

            migrationBuilder.DropColumn(
                name: "SimplesAnexo",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "ValidadesProposta",
                table: "empresas");
        }
    }
}
