using Elrond.Application.Common;
using Elrond.Application.DTOs;

namespace Elrond.Application.Interfaces;

public interface IAuthService
{
    Task<Result<LoginResponseDto>> LoginAsync(LoginDto dto);
}
