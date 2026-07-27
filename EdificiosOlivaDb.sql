USE EdificiosOlivaDb;
GO

UPDATE Apartments
SET Status = 1
WHERE Status = 0;

SELECT Id, Name, Status
FROM Apartments;




USE EdificiosOlivaDb;
GO

SELECT COUNT(*)
FROM Apartments
WHERE IsDeleted = 0;