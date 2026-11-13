using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EdificiosOliva.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261113193000_AddPublicPaymentCapability")]
    public partial class AddPublicPaymentCapability : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PublicAccessKeyVersion",
                table: "Reservations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicAccessNonce",
                table: "Reservations",
                type: "nvarchar(44)",
                maxLength: 44,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PublicAccessNonce", table: "Reservations");
            migrationBuilder.DropColumn(name: "PublicAccessKeyVersion", table: "Reservations");
        }
    }
}
