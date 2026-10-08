using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NumeracaoFormulaTotal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Numero",
                table: "propostas",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "FormulaTotal",
                table: "ficha_grupos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "PropostaDigitos",
                table: "empresas",
                type: "integer",
                nullable: false,
                defaultValue: 4);

            migrationBuilder.AddColumn<string>(
                name: "PropostaPrefixo",
                table: "empresas",
                type: "character varying(15)",
                maxLength: 15,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "proposta_numeracao",
                columns: table => new
                {
                    EmpresaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Ultimo = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_proposta_numeracao", x => x.EmpresaId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_propostas_Numero",
                table: "propostas",
                column: "Numero",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "proposta_numeracao");

            migrationBuilder.DropIndex(
                name: "IX_propostas_Numero",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "FormulaTotal",
                table: "ficha_grupos");

            migrationBuilder.DropColumn(
                name: "PropostaDigitos",
                table: "empresas");

            migrationBuilder.DropColumn(
                name: "PropostaPrefixo",
                table: "empresas");

            migrationBuilder.AlterColumn<string>(
                name: "Numero",
                table: "propostas",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40);
        }
    }
}
