using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UsuarioConvite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ConviteAceitoEm",
                table: "usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConviteClicadoEm",
                table: "usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConviteEmail",
                table: "usuarios",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ConviteEnviadoEm",
                table: "usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConviteExpiraEm",
                table: "usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConviteTokenHash",
                table: "usuarios",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_ConviteTokenHash",
                table: "usuarios",
                column: "ConviteTokenHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_usuarios_ConviteTokenHash",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "ConviteAceitoEm",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "ConviteClicadoEm",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "ConviteEmail",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "ConviteEnviadoEm",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "ConviteExpiraEm",
                table: "usuarios");

            migrationBuilder.DropColumn(
                name: "ConviteTokenHash",
                table: "usuarios");
        }
    }
}
