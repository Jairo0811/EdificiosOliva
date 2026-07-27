USE EdificiosOlivaDb;
GO

SELECT
    Id,
    Name,
    PricePerNight,
    Status,
    CreatedAtUtc,
    UpdatedAtUtc,
    IsDeleted
FROM Apartments
ORDER BY CreatedAtUtc DESC;