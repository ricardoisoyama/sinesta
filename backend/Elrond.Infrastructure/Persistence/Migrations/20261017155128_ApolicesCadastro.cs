using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ApolicesCadastro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "apolices",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    SeguradoraId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Numero = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    EmpresaIds = table.Column<List<string>>(type: "text[]", nullable: false),
                    VigenciaInicio = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    VigenciaFim = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    LimitePorEmbarque = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    CustoEmissao = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Iof = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    TaxaUrbana = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    TaxaPadrao = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Documentos = table.Column<List<string>>(type: "text[]", nullable: false),
                    Observacao = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<string>(type: "text", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: false),
                    AlteradoEm = table.Column<string>(type: "text", nullable: false),
                    AlteradoPor = table.Column<string>(type: "text", nullable: false),
                    InativadoEm = table.Column<string>(type: "text", nullable: false),
                    InativadoPor = table.Column<string>(type: "text", nullable: false),
                    Taxas = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_apolices", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_apolices_SeguradoraId",
                table: "apolices",
                column: "SeguradoraId");

            // As apólices que já estavam dentro do fornecedor seguradora passam para o cadastro próprio.
            // A coluna antiga fica como estava (nada é apagado).
            migrationBuilder.Sql(@"
INSERT INTO apolices (""Id"", ""SeguradoraId"", ""Tipo"", ""Numero"", ""EmpresaIds"", ""VigenciaInicio"", ""VigenciaFim"",
    ""LimitePorEmbarque"", ""CustoEmissao"", ""Iof"", ""TaxaUrbana"", ""TaxaPadrao"", ""Documentos"", ""Observacao"", ""Status"",
    ""CriadoEm"", ""CriadoPor"", ""AlteradoEm"", ""AlteradoPor"", ""InativadoEm"", ""InativadoPor"", ""Taxas"")
SELECT a->>'Id', f.""Id"", coalesce(a->>'Tipo', 'RCTR-C'), coalesce(a->>'Numero', ''),
    coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(a->'EmpresaIds', '[]'::jsonb))), '{}'),
    coalesce(a->>'VigenciaInicio', ''), coalesce(a->>'VigenciaFim', ''),
    coalesce((a->>'LimitePorEmbarque')::numeric, 0), coalesce((a->>'CustoEmissao')::numeric, 0), coalesce((a->>'Iof')::numeric, 0),
    coalesce((a->>'TaxaUrbana')::numeric, 0), coalesce((a->>'TaxaPadrao')::numeric, 0),
    coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(a->'Documentos', '[]'::jsonb))), '{}'),
    left(coalesce(a->>'Observacao', ''), 400), CASE WHEN f.""Status"" = 'inativo' THEN 'inativo' ELSE coalesce(a->>'Status', 'ativo') END,
    f.""AlteradoEm"", f.""AlteradoPor"", '', '', '', '', coalesce(a->'Taxas', '[]'::jsonb)
FROM fornecedores f, jsonb_array_elements(f.""Apolices"") a
WHERE f.""Apolices"" IS NOT NULL AND jsonb_typeof(f.""Apolices"") = 'array' AND coalesce(a->>'Id', '') <> ''
ON CONFLICT (""Id"") DO NOTHING;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "apolices");
        }
    }
}
