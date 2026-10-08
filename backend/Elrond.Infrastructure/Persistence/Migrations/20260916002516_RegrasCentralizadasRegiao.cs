using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RegrasCentralizadasRegiao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RegioesBloqueadas",
                table: "vendedores",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComissaoBase",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "ComissaoPercentual",
                table: "regras_aprovacao",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CompradorId",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EtapaCrmId",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<List<string>>(
                name: "Excecoes",
                table: "regras_aprovacao",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.AddColumn<decimal>(
                name: "Limite",
                table: "regras_aprovacao",
                type: "numeric(18,6)",
                precision: 18,
                scale: 6,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Observacao",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "proposta");

            migrationBuilder.AddColumn<string>(
                name: "VendedorId",
                table: "regras_aprovacao",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RegioesBloqueadas",
                table: "vendedores");

            migrationBuilder.DropColumn(
                name: "ComissaoBase",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "ComissaoPercentual",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "CompradorId",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "EtapaCrmId",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "Excecoes",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "Limite",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "Observacao",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "regras_aprovacao");

            migrationBuilder.DropColumn(
                name: "VendedorId",
                table: "regras_aprovacao");
        }
    }
}
