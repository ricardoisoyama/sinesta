using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Elrond.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FeriadoAbrangencia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Abrangencia",
                table: "feriados",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "todas");

            migrationBuilder.AddColumn<string>(
                name: "Cidade",
                table: "feriados",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Uf",
                table: "feriados",
                type: "character varying(2)",
                maxLength: 2,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Abrangencia",
                table: "feriados");

            migrationBuilder.DropColumn(
                name: "Cidade",
                table: "feriados");

            migrationBuilder.DropColumn(
                name: "Uf",
                table: "feriados");
        }
    }
}
