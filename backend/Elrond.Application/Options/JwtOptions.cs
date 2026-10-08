namespace Elrond.Application.Options;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = "Elrond";
    public string Audience { get; set; } = "Elrond";
    public int ExpirationHours { get; set; } = 8;
}
