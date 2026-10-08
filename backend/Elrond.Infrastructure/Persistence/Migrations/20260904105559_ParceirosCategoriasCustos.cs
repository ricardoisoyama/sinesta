using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Cadastros novos (clientes, fornecedores, vendedores e categorias de despesa) e a
    /// evolução do custo fixo: categoria vira referência, e a despesa ganha tipo
    /// (recorrente/spot), vigência e fornecedor. As categorias que existiam como texto
    /// viram registros, sem perder dado.
    /// </summary>
    public partial class ParceirosCategoriasCustos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categorias_custo",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    PlanoContaId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categorias_custo", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "clientes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    NomeFantasia = table.Column<string>(type: "text", nullable: false),
                    CpfCnpj = table.Column<string>(type: "text", nullable: false),
                    InscricaoEstadual = table.Column<string>(type: "text", nullable: false),
                    InscricaoMunicipal = table.Column<string>(type: "text", nullable: false),
                    Contato = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Cidade = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clientes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fornecedores",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    NomeFantasia = table.Column<string>(type: "text", nullable: false),
                    CpfCnpj = table.Column<string>(type: "text", nullable: false),
                    InscricaoEstadual = table.Column<string>(type: "text", nullable: false),
                    InscricaoMunicipal = table.Column<string>(type: "text", nullable: false),
                    Contato = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Cidade = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fornecedores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vendedores",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    CpfCnpj = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Cidade = table.Column<string>(type: "text", nullable: false),
                    ComissaoPercentual = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    ComissaoBase = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vendedores", x => x.Id);
                });

            // Categorias padrão (as que eram fixas no código), já apontando para a conta
            // do plano de contas quando ela existe na base.
            migrationBuilder.Sql("""
                INSERT INTO categorias_custo ("Id", "Nome", "PlanoContaId", "Status")
                SELECT v.id, v.nome, COALESCE(pc."Id", ''), 'ativo'
                FROM (VALUES
                    ('cat-pessoal',    'Pessoal',            'pc-pessoal'),
                    ('cat-contabil',   'Contábil/Jurídico',  'pc-contabil'),
                    ('cat-ti',         'Sistemas/TI',        'pc-ti'),
                    ('cat-marketing',  'Marketing',          'pc-marketing'),
                    ('cat-seguros',    'Seguros',            'pc-seguros'),
                    ('cat-operacional','Operacional',        'pc-operacional')
                ) AS v(id, nome, conta)
                LEFT JOIN plano_contas pc ON pc."Id" = v.conta;
                """);

            // Categorias digitadas fora da lista padrão também viram cadastro.
            migrationBuilder.Sql("""
                INSERT INTO categorias_custo ("Id", "Nome", "PlanoContaId", "Status")
                SELECT 'cat-' || left(md5(d."Categoria"), 8), d."Categoria", '', 'ativo'
                FROM (SELECT DISTINCT "Categoria" FROM custos_fixos) d
                WHERE d."Categoria" IS NOT NULL AND d."Categoria" <> ''
                  AND NOT EXISTS (SELECT 1 FROM categorias_custo c WHERE c."Nome" = d."Categoria");
                """);

            migrationBuilder.AddColumn<string>(
                name: "CategoriaId",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "recorrente");

            migrationBuilder.AddColumn<string>(
                name: "DataInicio",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DataFim",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FornecedorId",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            // Liga cada custo à sua categoria e preserva a conta que era derivada dela.
            migrationBuilder.Sql("""
                UPDATE custos_fixos cf
                SET "CategoriaId" = COALESCE((SELECT c."Id" FROM categorias_custo c WHERE c."Nome" = cf."Categoria"), '');
                """);

            migrationBuilder.Sql("""
                UPDATE custos_fixos cf
                SET "PlanoContaId" = c."PlanoContaId"
                FROM categorias_custo c
                WHERE c."Id" = cf."CategoriaId"
                  AND c."PlanoContaId" <> ''
                  AND (cf."PlanoContaId" IS NULL OR cf."PlanoContaId" = '');
                """);

            migrationBuilder.DropColumn(
                name: "Categoria",
                table: "custos_fixos");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Categoria",
                table: "custos_fixos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE custos_fixos cf
                SET "Categoria" = COALESCE((SELECT c."Nome" FROM categorias_custo c WHERE c."Id" = cf."CategoriaId"), '');
                """);

            migrationBuilder.DropColumn(name: "CategoriaId", table: "custos_fixos");
            migrationBuilder.DropColumn(name: "Tipo", table: "custos_fixos");
            migrationBuilder.DropColumn(name: "DataInicio", table: "custos_fixos");
            migrationBuilder.DropColumn(name: "DataFim", table: "custos_fixos");
            migrationBuilder.DropColumn(name: "FornecedorId", table: "custos_fixos");

            migrationBuilder.DropTable(name: "categorias_custo");
            migrationBuilder.DropTable(name: "clientes");
            migrationBuilder.DropTable(name: "fornecedores");
            migrationBuilder.DropTable(name: "vendedores");
        }
    }
}
