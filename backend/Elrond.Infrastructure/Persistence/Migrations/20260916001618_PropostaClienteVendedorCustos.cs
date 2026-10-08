using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PropostaClienteVendedorCustos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClienteId",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MotivoAprovacao",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "PrazoPagamentoDias",
                table: "propostas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "VendedorId",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "VendedorNome",
                table: "propostas",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClienteId",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "MotivoAprovacao",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "PrazoPagamentoDias",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "VendedorId",
                table: "propostas");

            migrationBuilder.DropColumn(
                name: "VendedorNome",
                table: "propostas");
        }
    }
}
