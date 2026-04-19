--------------------------------------------------------
-- SAFE RESET: DROP ALL TABLES BEFORE RECREATING
--------------------------------------------------------

IF DB_ID('OnlineVoting_db') IS NOT NULL
BEGIN
    USE OnlineVoting_db;

    -- DROP BY DEPENDENCY ORDER (CHILD ? PARENT)
    DROP TABLE IF EXISTS Notifications;
    DROP TABLE IF EXISTS AuditLogs;
    DROP TABLE IF EXISTS Sessions;
    DROP TABLE IF EXISTS Votes;
    DROP TABLE IF EXISTS Results;
    DROP TABLE IF EXISTS Candidates;
    DROP TABLE IF EXISTS Voter_Registration;
    DROP TABLE IF EXISTS Elections;
    DROP TABLE IF EXISTS Admin_Details;
    DROP TABLE IF EXISTS Management_Details;
    DROP TABLE IF EXISTS Faculty_Details;
    DROP TABLE IF EXISTS Student_Details;
    DROP TABLE IF EXISTS Users;
    DROP TABLE IF EXISTS Positions;
    DROP TABLE IF EXISTS Departments;
    DROP TABLE IF EXISTS Campuses;
END
ELSE
BEGIN
    PRINT 'Database does not exist yet. Ready to create! ??';
END
GO




-----------------------------------------------------
-- DATABASE CREATION
-----------------------------------------------------
CREATE DATABASE OnlineVoting_db;
GO
USE OnlineVoting_db;
GO

-----------------------------------------------------
-- TABLES
-----------------------------------------------------

CREATE TABLE Campuses (
    CampusID INT IDENTITY(1,1) PRIMARY KEY,
    CampusName NVARCHAR(100) NOT NULL,
    Location NVARCHAR(150),
    EstablishedYear INT,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

CREATE TABLE Departments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    CampusID INT NOT NULL,
    DeptName NVARCHAR(100) NOT NULL,
    FOREIGN KEY (CampusID) REFERENCES Campuses(CampusID)
);

CREATE TABLE Positions (
    PositionID INT IDENTITY(1,1) PRIMARY KEY,
    PositionName VARCHAR(100) NOT NULL,
    ElectionType VARCHAR(20),
    EligibilityCriteria NVARCHAR(MAX),
    TermYears INT
);

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    CampusID INT NOT NULL,
    DepartmentID INT NULL,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL,
    CNIC VARCHAR(15) UNIQUE NOT NULL,
    PhoneNumber VARCHAR(15),
    LastLogin DATETIME,
    IsVerified BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CampusID) REFERENCES Campuses(CampusID),
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

CREATE TABLE Student_Details (
    StudentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT UNIQUE NOT NULL,
    RollNumber VARCHAR(50) UNIQUE NOT NULL,
    Batch VARCHAR(20),
    Semester INT,
    Section VARCHAR(10),
    AdmissionYear INT,
    IsGraduated BIT DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Faculty_Details (
    FacultyID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT UNIQUE NOT NULL,
    Designation VARCHAR(50),
    Qualification VARCHAR(100),
    JoiningDate DATE,
    IsActive BIT DEFAULT 1,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Management_Details (
    ManagementID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT UNIQUE NOT NULL,
    Position VARCHAR(50),
    Responsibility NVARCHAR(MAX),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Admin_Details (
    AdminID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT UNIQUE NOT NULL,
    AccessLevel VARCHAR(20),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Elections (
    ElectionID INT IDENTITY(1,1) PRIMARY KEY,
    CampusID INT NOT NULL,
    PositionID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    StartDate DATETIME NOT NULL,
    EndDate DATETIME NOT NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CampusID) REFERENCES Campuses(CampusID),
    FOREIGN KEY (PositionID) REFERENCES Positions(PositionID)
);

CREATE TABLE Voter_Registration (
    RegistrationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ElectionID INT NOT NULL,
    VoterToken VARCHAR(255) UNIQUE NOT NULL,
    RegistrationDate DATETIME DEFAULT GETDATE(),
    Status VARCHAR(20),
    RejectionReason NVARCHAR(255),
    VerifiedBy INT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
    FOREIGN KEY (VerifiedBy) REFERENCES Users(UserID),
    UNIQUE (UserID, ElectionID)
);

CREATE TABLE Candidates (
    CandidateID INT IDENTITY(1,1) PRIMARY KEY,
    ElectionID INT NOT NULL,
    UserID INT NOT NULL,
    Symbol NVARCHAR(MAX),
    Manifesto NVARCHAR(MAX),
    FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Votes (
    VoteID INT IDENTITY(1,1) PRIMARY KEY,
    ElectionID INT NOT NULL,
    CandidateID INT NOT NULL,
    VoterToken VARCHAR(255) NOT NULL,
    IPAddress VARCHAR(45),
    VotedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID),
    UNIQUE (ElectionID, VoterToken)
);

CREATE TABLE Results (
    ResultID INT IDENTITY(1,1) PRIMARY KEY,
    ElectionID INT NOT NULL,
    CandidateID INT NOT NULL,
    TotalVotes INT DEFAULT 0,
    DeclaredAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID),
    UNIQUE (ElectionID, CandidateID)
);

CREATE TABLE Sessions (
    SessionID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Token VARCHAR(255) UNIQUE NOT NULL,
    IPAddress VARCHAR(45),
    ExpiryTime DATETIME NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE AuditLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL,
    Action VARCHAR(100) NOT NULL,
    Details NVARCHAR(MAX),
    Timestamp DATETIME DEFAULT GETDATE(),
    IPAddress VARCHAR(45),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Type VARCHAR(50) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    SentDate DATETIME DEFAULT GETDATE(),
    IsRead BIT DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-----------------------------------------------------
-- TRIGGERS
-----------------------------------------------------

-- Auto update UpdatedAt field
CREATE TRIGGER trg_Update_Users
ON Users
AFTER UPDATE
AS
BEGIN
    UPDATE Users SET UpdatedAt = GETDATE()
    WHERE UserID IN (SELECT UserID FROM inserted);
END;
GO

CREATE TRIGGER trg_Update_Elections
ON Elections
AFTER UPDATE
AS
BEGIN
    UPDATE Elections SET UpdatedAt = GETDATE()
    WHERE ElectionID IN (SELECT ElectionID FROM inserted);
END;
GO

-- Prevent double voting
CREATE TRIGGER trg_PreventDoubleVote
ON Votes
INSTEAD OF INSERT
AS
BEGIN
    IF EXISTS (
        SELECT 1 FROM Votes v
        JOIN inserted i ON v.ElectionID = i.ElectionID AND v.VoterToken = i.VoterToken
    )
    BEGIN
        RAISERROR('You have already voted in this election.', 16, 1);
        RETURN;
    END

    INSERT INTO Votes (ElectionID, CandidateID, VoterToken, IPAddress, VotedAt)
    SELECT ElectionID, CandidateID, VoterToken, IPAddress, GETDATE()
    FROM inserted;
END;
GO

-- Prevent voting outside date range
CREATE TRIGGER trg_Validate_ElectionTime
ON Votes
AFTER INSERT
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN Elections e ON i.ElectionID = e.ElectionID
        WHERE GETDATE() NOT BETWEEN e.StartDate AND e.EndDate
    )
    BEGIN
        RAISERROR('Voting is not allowed at this time.', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO

-- Auto update results count
CREATE TRIGGER trg_UpdateResults
ON Votes
AFTER INSERT
AS
BEGIN
    UPDATE Results
    SET TotalVotes = TotalVotes + 1
    WHERE ElectionID IN (SELECT ElectionID FROM inserted)
    AND CandidateID IN (SELECT CandidateID FROM inserted);
END;
GO

-- Auto insert default result row on candidate creation
CREATE TRIGGER trg_CreateResultRecord
ON Candidates
AFTER INSERT
AS
BEGIN
    INSERT INTO Results (ElectionID, CandidateID, TotalVotes)
    SELECT ElectionID, CandidateID, 0
    FROM inserted;
END;
GO

-- Audit Logs trigger for votes
CREATE TRIGGER trg_Audit_Votes
ON Votes
AFTER INSERT, DELETE
AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO AuditLogs (UserID, Action, Details, IPAddress)
        SELECT NULL, 'Vote Cast', CONCAT('Vote cast for CandidateID: ', CandidateID), IPAddress
        FROM inserted;
    END

    IF EXISTS (SELECT 1 FROM deleted)
    BEGIN
        INSERT INTO AuditLogs (UserID, Action, Details)
        SELECT NULL, 'Vote Removed', CONCAT('Vote removed for CandidateID: ', CandidateID)
        FROM deleted;
    END
END;
GO

-----------------------------------------------------
-- INSERT INTO Campuses
-----------------------------------------------------
INSERT INTO Campuses (CampusName, Location, EstablishedYear)
VALUES
('FAST Islamabad', 'Islamabad', 1990),
('FAST Lahore', 'Lahore', 1991),
('FAST Karachi', 'Karachi', 1985),
('FAST Peshawar', 'Peshawar', 2005);

-----------------------------------------------------
-- INSERT INTO Departments
-----------------------------------------------------
INSERT INTO Departments (CampusID, DeptName)
VALUES
(1, 'Computer Science'),
(1, 'Electrical Engineering'),
(2, 'Computer Science'),
(2, 'Business Administration'),
(3, 'Software Engineering'),
(4, 'Civil Engineering');

select * from Departments
-----------------------------------------------------
-- INSERT INTO Positions
-----------------------------------------------------
INSERT INTO Positions (PositionName, ElectionType, EligibilityCriteria, TermYears)
VALUES
('President', 'Student', 'Must be final year student', 1),
('Vice President', 'Student', 'Must be at least in 3rd semester', 1),
('General Secretary', 'Student', 'Minimum CGPA 2.5', 1),
('Club Coordinator', 'Faculty', 'Full-time faculty', 2);

-----------------------------------------------------
-- INSERT INTO Users
-----------------------------------------------------
INSERT INTO Users (CampusID, DepartmentID, Name, Email, PasswordHash, Role, CNIC, PhoneNumber)
VALUES
(1, 1, 'Ali Khan', 'ali@fast.edu.pk', 'pwd1', 'Student', '35202-1111111-1', '03001234567'),
(1, 2, 'Sara Ahmed', 'sara@fast.edu.pk', 'pwd2', 'Student', '35202-2222222-2', '03011234567'),
(2, 3, 'Usman Tariq', 'usman@fast.edu.pk', 'pwd3', 'Student', '35202-3333333-3', '03021234567'),
(2, 4, 'Prof. Salman', 'salman@fast.edu.pk', 'pwd4', 'Faculty', '35202-4444444-4', '03031234567'),
(1, 1, 'Admin User', 'admin@fast.edu.pk', 'pwd5', 'Admin', '35202-5555555-5', '03041234567');

-----------------------------------------------------
-- INSERT INTO Student_Details
-----------------------------------------------------
INSERT INTO Student_Details (UserID, RollNumber, Batch, Semester, Section, AdmissionYear)
VALUES
(1, '21F-1234', 'BSCS', 7, 'A', 2021),
(2, '22F-5678', 'BSSE', 5, 'B', 2022),
(3, '20F-9012', 'BSCS', 8, 'A', 2020);

-----------------------------------------------------
-- INSERT INTO Faculty_Details
-----------------------------------------------------
INSERT INTO Faculty_Details (UserID, Designation, Qualification, JoiningDate)
VALUES
(4, 'Assistant Professor', 'PhD CS', '2018-01-01');

-----------------------------------------------------
-- INSERT INTO Admin_Details
-----------------------------------------------------
INSERT INTO Admin_Details (UserID, AccessLevel)
VALUES
(5, 'SuperAdmin');

-----------------------------------------------------
-- INSERT INTO Elections
-----------------------------------------------------
INSERT INTO Elections (CampusID, PositionID, Title, Description, StartDate, EndDate)
VALUES
(1, 1, 'FAST Lahore Presidential Election 2025', 'Election for student president', '2025-11-10', '2025-11-15'),
(2, 2, 'FAST Islamabad Vice President 2025', 'Election for VP', '2025-11-11', '2025-11-16');

-----------------------------------------------------
-- INSERT INTO Voter_Registration
-----------------------------------------------------
INSERT INTO Voter_Registration (UserID, ElectionID, VoterToken, Status)
VALUES
(1, 1, 'TOKEN-STD-001', 'Approved'),
(2, 1, 'TOKEN-STD-002', 'Approved'),
(3, 2, 'TOKEN-STD-003', 'Approved');

-----------------------------------------------------
-- INSERT INTO Candidates
-----------------------------------------------------
INSERT INTO Candidates (ElectionID, UserID, Symbol, Manifesto)
VALUES
(1, 1, 'Laptop', 'Better labs and facilities'),
(1, 2, 'Book', 'More study resources'),
(2, 3, 'Star', 'Focus on campus events');

-----------------------------------------------------
-- INSERT INTO Votes
-- Will automatically update Results using triggers
-----------------------------------------------------
INSERT INTO Votes (ElectionID, CandidateID, VoterToken, IPAddress)
VALUES
(1, 1, 'TOKEN-STD-001', '192.168.1.10'),
(1, 2, 'TOKEN-STD-002', '192.168.1.11'),
(2, 3, 'TOKEN-STD-003', '192.168.1.12');

-----------------------------------------------------
-- OPTIONAL MANUAL RESULTS INSERT (Triggers will also auto do it)
-----------------------------------------------------
-- Only if needed:
-- INSERT INTO Results (ElectionID, CandidateID, TotalVotes)
-- VALUES (1, 1, 0), (1, 2, 0), (2, 3, 0);



-- 1️⃣ Disable ALL foreign keys
EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL";

-----------------------------------------------------
-- 2️⃣ TRUNCATE CHILD TABLES (FK dependent)
-----------------------------------------------------
TRUNCATE TABLE Notifications;
TRUNCATE TABLE AuditLogs;
TRUNCATE TABLE Sessions;
TRUNCATE TABLE Votes;
TRUNCATE TABLE Results;
TRUNCATE TABLE Voter_Registration;

-----------------------------------------------------
-- 3️⃣ DELETE FROM PARENT TABLES (cannot truncate)
-----------------------------------------------------
DELETE FROM Elections;
DELETE FROM Admin_Details;
DELETE FROM Management_Details;
DELETE FROM Faculty_Details;
DELETE FROM Student_Details;
DELETE FROM Users;
DELETE FROM Positions;
DELETE FROM Departments;
DELETE FROM Campuses;
DELETE FROM Candidates;
-----------------------------------------------------
-- 4️⃣ Re-enable ALL foreign keys
-----------------------------------------------------
EXEC sp_msforeachtable "ALTER TABLE ? CHECK CONSTRAINT ALL";



-----------------------------------------------------
-- 5️⃣ SHOW ALL TABLES (SELECT *)
-----------------------------------------------------
SELECT * FROM Campuses;
SELECT * FROM Departments;
SELECT * FROM Positions;
SELECT * FROM Users;
SELECT * FROM Student_Details;
SELECT * FROM Faculty_Details;
SELECT * FROM Management_Details;
SELECT * FROM Admin_Details;
SELECT * FROM Elections;
SELECT * FROM Voter_Registration;
SELECT * FROM Candidates;
SELECT * FROM Votes;
SELECT * FROM Results;
SELECT * FROM Sessions;
SELECT * FROM AuditLogs;
SELECT * FROM Notifications;