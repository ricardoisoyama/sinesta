using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class VariaveisDespesaFixaRetencoesServico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ItensVariaveis",
                table: "movimentos",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorVariavel",
                table: "movimentos",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.Sql("""UPDATE movimentos SET "ItensVariaveis" = '[]'::jsonb WHERE "ItensVariaveis" IS NULL;""");

            // Retenções da NFS-e passam da empresa para os dados fiscais do serviço (por empresa emitente):
            // cada dado fiscal recebe o que a empresa dele retinha (as chaves que já existirem ficam).
            migrationBuilder.Sql("""
                UPDATE servicos s SET "Fiscais" = (
                    SELECT coalesce(jsonb_agg(jsonb_build_object(
                        'RetencaoIr', coalesce((SELECT CASE WHEN (e."Ir"->>'Retido')::boolean THEN (e."Ir"->>'Aliquota')::numeric ELSE 0 END FROM empresas e WHERE e."Id" = f->>'EmpresaId'), 0),
                        'RetencaoPis', coalesce((SELECT CASE WHEN (e."Pis"->>'Retido')::boolean THEN (e."Pis"->>'Aliquota')::numeric ELSE 0 END FROM empresas e WHERE e."Id" = f->>'EmpresaId'), 0),
                        'RetencaoCofins', coalesce((SELECT CASE WHEN (e."Cofins"->>'Retido')::boolean THEN (e."Cofins"->>'Aliquota')::numeric ELSE 0 END FROM empresas e WHERE e."Id" = f->>'EmpresaId'), 0),
                        'RetencaoCsll', coalesce((SELECT CASE WHEN (e."Csll"->>'Retido')::boolean THEN (e."Csll"->>'Aliquota')::numeric ELSE 0 END FROM empresas e WHERE e."Id" = f->>'EmpresaId'), 0),
                        'RetencaoInss', coalesce((SELECT CASE WHEN (e."Inss"->>'Retido')::boolean THEN (e."Inss"->>'Aliquota')::numeric ELSE 0 END FROM empresas e WHERE e."Id" = f->>'EmpresaId'), 0),
                        'IssRetido', coalesce((SELECT (e."Iss"->>'Retido')::boolean FROM empresas e WHERE e."Id" = f->>'EmpresaId'), false)
                    ) || f), '[]'::jsonb)
                    FROM jsonb_array_elements(s."Fiscais") f)
                WHERE s."Fiscais" IS NOT NULL AND jsonb_typeof(s."Fiscais") = 'array' AND jsonb_array_length(s."Fiscais") > 0;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ItensVariaveis",
                table: "movimentos");

            migrationBuilder.DropColumn(
                name: "ValorVariavel",
                table: "movimentos");
        }
    }
}
