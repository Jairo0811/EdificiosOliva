USE EdificiosOlivaDb;
GO

SELECT MigrationId, ProductVersion
FROM __EFMigrationsHistory
ORDER BY MigrationId;

SELECT *
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'Customers';


SELECT *
FROM ApartmentImages;