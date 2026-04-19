-- Migration to add Candidate Applications table and EligibleVoters column
USE OnlineVoting_db;
GO

-- 1. Add EligibleVoters column to Elections table
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'Elections')
    AND name = 'EligibleVoters'
)
BEGIN
    ALTER TABLE Elections
    ADD EligibleVoters NVARCHAR(50) DEFAULT 'All';
    PRINT 'EligibleVoters column added to Elections table.';
END
ELSE
BEGIN
    PRINT 'EligibleVoters column already exists.';
END
GO

-- Update existing elections
UPDATE Elections
SET EligibleVoters = 'All'
WHERE EligibleVoters IS NULL;
GO

-- 2. Create Candidate_Applications table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Candidate_Applications')
BEGIN
    CREATE TABLE Candidate_Applications (
        ApplicationID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        ElectionID INT NOT NULL,
        Symbol NVARCHAR(MAX),
        Manifesto NVARCHAR(MAX),
        ApplicationDate DATETIME DEFAULT GETDATE(),
        Status NVARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected
        RejectionReason NVARCHAR(255),
        ReviewedBy INT NULL,
        ReviewedAt DATETIME NULL,
        FOREIGN KEY (UserID) REFERENCES Users(UserID),
        FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
        FOREIGN KEY (ReviewedBy) REFERENCES Users(UserID),
        UNIQUE (UserID, ElectionID)
    );
    PRINT 'Candidate_Applications table created successfully.';
END
ELSE
BEGIN
    PRINT 'Candidate_Applications table already exists.';
END
GO

-- 3. Add ApplicationID column to Candidates table (to link approved applications)
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

    PRINT 'ApplicationID column added to Candidates table.';
END
ELSE
BEGIN
    PRINT 'ApplicationID column already exists in Candidates.';
END
GO

-- Verify changes
PRINT 'Checking Elections table...';
SELECT TOP 3 ElectionID, Title, EligibleVoters FROM Elections;
GO

PRINT 'Checking Candidate_Applications table...';
SELECT COUNT(*) as ApplicationCount FROM Candidate_Applications;
GO

PRINT 'Migration completed successfully!';
GO
