/* -------------------------------------------------------------------------
   Fix Candidate_Applications Table Missing Columns
   This script safely adds Symbol, Manifesto, RejectionReason, ReviewedBy,
   and ReviewedAt columns ONLY if they do not already exist.
--------------------------------------------------------------------------- */

USE OnlineVoting_db;
GO

/* ---------------------- Add Symbol ---------------------- */
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Candidate_Applications') 
      AND name = 'Symbol'
)
BEGIN
    ALTER TABLE Candidate_Applications 
        ADD Symbol NVARCHAR(MAX) NULL;

    PRINT 'Added Symbol column to Candidate_Applications';
END
ELSE PRINT 'Symbol column already exists in Candidate_Applications.';
GO

/* ---------------------- Add Manifesto ---------------------- */
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Candidate_Applications') 
      AND name = 'Manifesto'
)
BEGIN
    ALTER TABLE Candidate_Applications 
        ADD Manifesto NVARCHAR(MAX) NULL;

    PRINT 'Added Manifesto column to Candidate_Applications';
END
ELSE PRINT 'Manifesto column already exists in Candidate_Applications.';
GO

/* ---------------------- Add RejectionReason ---------------------- */
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Candidate_Applications') 
      AND name = 'RejectionReason'
)
BEGIN
    ALTER TABLE Candidate_Applications 
        ADD RejectionReason NVARCHAR(255) NULL;

    PRINT 'Added RejectionReason column to Candidate_Applications';
END
ELSE PRINT 'RejectionReason column already exists in Candidate_Applications.';
GO

/* ---------------------- Add ReviewedBy ---------------------- */
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Candidate_Applications') 
      AND name = 'ReviewedBy'
)
BEGIN
    ALTER TABLE Candidate_Applications 
        ADD ReviewedBy INT NULL;

    PRINT 'Added ReviewedBy column to Candidate_Applications';
END
ELSE PRINT 'ReviewedBy column already exists in Candidate_Applications.';
GO

/* ---------------------- Add ReviewedAt ---------------------- */
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Candidate_Applications') 
      AND name = 'ReviewedAt'
)
BEGIN
    ALTER TABLE Candidate_Applications 
        ADD ReviewedAt DATETIME NULL;

    PRINT 'Added ReviewedAt column to Candidate_Applications';
END
ELSE PRINT 'ReviewedAt column already exists in Candidate_Applications.';
GO



-- Add ApplicationDate column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'Candidate_Applications') 
      AND name = 'ApplicationDate'
)
BEGIN
    ALTER TABLE Candidate_Applications 
        ADD ApplicationDate DATETIME NOT NULL DEFAULT GETDATE();

    PRINT 'Added ApplicationDate column to Candidate_Applications';
END
ELSE
BEGIN
    PRINT 'ApplicationDate column already exists in Candidate_Applications.';
END
GO



-- Add ApplicationID column to Candidates table if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'Candidates')
      AND name = 'ApplicationID'
)
BEGIN
    ALTER TABLE Candidates 
        ADD ApplicationID INT NULL;

    ALTER TABLE Candidates
        ADD CONSTRAINT FK_Candidates_Applications
        FOREIGN KEY (ApplicationID) REFERENCES Candidate_Applications(ApplicationID);

    PRINT 'Added ApplicationID column and FK to Candidates table.';
END
ELSE
BEGIN
    PRINT 'ApplicationID column already exists in Candidates table.';
END
GO

PRINT 'Schema fix for Candidate_Applications and Candidates completed successfully!';
GO


