using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExclusaoLogicaRastro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "vendedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "validades_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "validades_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "validades_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "validades_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "validades_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "validades_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "tipos_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "taxas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "taxas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "taxas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "taxas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "taxas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "taxas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "servicos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "servicos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "servicos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "servicos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "servicos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "servicos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "plano_contas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "plano_contas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "plano_contas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "plano_contas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "plano_contas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "plano_contas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "ativo");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "modelos_proposta",
                type: "text",
                nullable: false,
                defaultValue: "ativo");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "metas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "metas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "metas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "metas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "metas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "metas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "metas",
                type: "text",
                nullable: false,
                defaultValue: "ativo");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "funis",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "funis",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "funis",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "funis",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "funis",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "funis",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "funis",
                type: "text",
                nullable: false,
                defaultValue: "ativo");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "fornecedores",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "empresas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "empresas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "empresas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "empresas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "empresas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "empresas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "clientes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "categorias_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "categorias_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "categorias_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "categorias_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "categorias_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "categorias_custo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoEm",
                table: "anexos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AlteradoPor",
                table: "anexos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoEm",
                table: "anexos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "anexos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoEm",
                table: "anexos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InativadoPor",
                table: "anexos",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "validades_proposta");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "validades_proposta");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "validades_proposta");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "validades_proposta");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "validades_proposta");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "validades_proposta");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "tipos_custo");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "taxas");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "taxas");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "taxas");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "taxas");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "taxas");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "taxas");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "servicos");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "servicos");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "servicos");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "servicos");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "servicos");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "servicos");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "plano_contas");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "oportunidades");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "oportunidades");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "oportunidades");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "oportunidades");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "oportunidades");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "oportunidades");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "oportunidades");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "modelos_proposta");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "metas");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "funis");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "funis");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "funis");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "funis");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "funis");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "funis");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "funis");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "fornecedores");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "custos_fixos");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "clientes");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "categorias_custo");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "categorias_custo");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "categorias_custo");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "categorias_custo");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "categorias_custo");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "categorias_custo");

            migrationBuilder.DropColumn(
                name: "AlteradoEm",
                table: "anexos");

            migrationBuilder.DropColumn(
                name: "AlteradoPor",
                table: "anexos");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "anexos");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "anexos");

            migrationBuilder.DropColumn(
                name: "InativadoEm",
                table: "anexos");

            migrationBuilder.DropColumn(
                name: "InativadoPor",
                table: "anexos");
        }
    }
}
