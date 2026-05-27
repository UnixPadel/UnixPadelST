using CrmModern.Core.DTOs.Common;
using CrmModern.Core.DTOs.Musteri;
using CrmModern.Core.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrmModern.API.Controllers;

/// <summary>
/// Customer + Country (Ulke) management.
/// Maps all operations originally in MusteriEkle.cs.
/// No DB/SQL code here — all delegated to IMusteriService.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class MusteriController(IMusteriService musteriService) : ControllerBase
{
    // ── Müşteri endpoints ────────────────────────────────────────────────────

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<MusteriDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var data = await musteriService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<MusteriDto>>.Ok(data));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MusteriDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>),     StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var data = await musteriService.GetByIdAsync(id);
        return Ok(ApiResponse<MusteriDto>.Ok(data));
    }

    [HttpPost]
    [Authorize(Roles = "Yonetici,Temsilci")]
    [ProducesResponseType(typeof(ApiResponse<MusteriDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>),     StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateMusteriDto dto)
    {
        var created = await musteriService.CreateAsync(dto);
        return CreatedAtAction(
            nameof(GetById),
            new { id = created.MusteriID },
            ApiResponse<MusteriDto>.Ok(created, "Müşteri başarıyla eklendi."));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Yonetici,Temsilci")]
    [ProducesResponseType(typeof(ApiResponse<MusteriDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<object>),     StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMusteriDto dto)
    {
        var updated = await musteriService.UpdateAsync(id, dto);
        return Ok(ApiResponse<MusteriDto>.Ok(updated, "Müşteri güncellendi."));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Yonetici")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        await musteriService.DeleteAsync(id);
        return NoContent();
    }

    // ── Ülke endpoints ───────────────────────────────────────────────────────

    [HttpGet("ulkeler")]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<UlkeDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUlkeler()
    {
        var data = await musteriService.GetUlkelerAsync();
        return Ok(ApiResponse<IEnumerable<UlkeDto>>.Ok(data));
    }

    [HttpPost("ulkeler")]
    [ProducesResponseType(typeof(ApiResponse<UlkeDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<object>),  StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateUlke([FromBody] CreateUlkeDto dto)
    {
        var created = await musteriService.CreateUlkeAsync(dto);
        return CreatedAtAction(
            nameof(GetUlkeler),
            ApiResponse<UlkeDto>.Ok(created, "Ülke başarıyla eklendi."));
    }
}
