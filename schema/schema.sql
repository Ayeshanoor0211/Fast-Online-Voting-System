
------------------------------------------------------------
-- Project: Online Voting System
-- Submitted By: AyeshaNoor_2575, HiraKhalid_2594 , AreebaNoor_2562,
-- Description: Database schema for managing campus elections
------------------------------------------------------------

CREATE DATABASE OnlineVoting_db;
GO
USE OnlineVoting_db;


------------------------------------------------
-- 1. Campuses
------------------------------------------------
CREATE TABLE Campuses (
    CampusID INT PRIMARY KEY IDENTITY(1,1),
    CampusName NVARCHAR(100) NOT NULL,
    Location NVARCHAR(150),
    EstablishedYear INT CHECK (EstablishedYear > 1800),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

------------------------------------------------
-- 2. Departments
------------------------------------------------
CREATE TABLE Departments (
    DepartmentID INT PRIMARY KEY IDENTITY(1,1),
    CampusID INT NOT NULL,
    DeptName NVARCHAR(100) NOT NULL,
    FOREIGN KEY (CampusID) REFERENCES Campuses(CampusID)
);

------------------------------------------------
-- 3. Users (General Info)
------------------------------------------------
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    CampusID INT NOT NULL,
    DepartmentID INT NULL,                         -- NULL for admin/management
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL 
        CHECK (Role IN ('Student','Faculty','Management','Admin')),
    CNIC VARCHAR(15) NOT NULL UNIQUE,
    PhoneNumber VARCHAR(15),
    LastLogin DATETIME,
    IsVerified BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CampusID) REFERENCES Campuses(CampusID),
    FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID)
);

------------------------------------------------
-- 4. Student_Details
------------------------------------------------
CREATE TABLE Student_Details (
    StudentID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL UNIQUE,
    RollNumber VARCHAR(50) NOT NULL UNIQUE,
    Batch VARCHAR(20),
    Semester INT CHECK (Semester > 0),
    Section VARCHAR(10),
    AdmissionYear INT,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

------------------------------------------------
-- 5. Faculty_Details
------------------------------------------------
CREATE TABLE Faculty_Details (
    FacultyID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL UNIQUE,
    Designation VARCHAR(50),       -- Professor, Lecturer, etc.
    Qualification VARCHAR(100),
    JoiningDate DATE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

------------------------------------------------
-- 6. Management_Details
------------------------------------------------
CREATE TABLE Management_Details (
    ManagementID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL UNIQUE,
    Position VARCHAR(50),          -- e.g., Election Officer
    Responsibility NVARCHAR(MAX),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

------------------------------------------------
-- 7. Admin_Details
------------------------------------------------
CREATE TABLE Admin_Details (
    AdminID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL UNIQUE,
    AccessLevel VARCHAR(20),       -- SuperAdmin, DBAdmin
    LastLogin DATETIME,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

------------------------------------------------
-- 8. Elections
------------------------------------------------
CREATE TABLE Elections (
    ElectionID INT PRIMARY KEY IDENTITY(1,1),
    CampusID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    ElectionType VARCHAR(20) CHECK (ElectionType IN ('Student','Faculty')),
    Position VARCHAR(100) NOT NULL,
    StartDate DATETIME NOT NULL,
    EndDate DATETIME NOT NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CampusID) REFERENCES Campuses(CampusID)
);

------------------------------------------------
-- 9. Candidates
------------------------------------------------
CREATE TABLE Candidates (
    CandidateID INT PRIMARY KEY IDENTITY(1,1),
    ElectionID INT NOT NULL,
    UserID INT NOT NULL,
    Manifesto NVARCHAR(MAX),
    FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

------------------------------------------------
-- 10. Votes
------------------------------------------------
CREATE TABLE Votes (
    VoteID INT PRIMARY KEY IDENTITY(1,1),
    ElectionID INT NOT NULL,
    CandidateID INT NOT NULL,
    UserID INT NOT NULL,
    VotedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT UQ_Vote UNIQUE (ElectionID, UserID)
);

------------------------------------------------
-- 11. Results
------------------------------------------------
CREATE TABLE Results (
    ResultID INT PRIMARY KEY IDENTITY(1,1),
    ElectionID INT NOT NULL,
    CandidateID INT NOT NULL,
    TotalVotes INT DEFAULT 0,
    DeclaredAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ElectionID) REFERENCES Elections(ElectionID),
    FOREIGN KEY (CandidateID) REFERENCES Candidates(CandidateID)
);


------------------------------------------------------------
-- CRUD OPERATIONS
------------------------------------------------------------

------------------------------------------------------------
-- 1. Campuses
------------------------------------------------------------
-- CREATE
INSERT INTO Campuses (CampusName, Location, EstablishedYear)
VALUES ('FAST Lahore', 'Faisal Town,Lahore', 2000);

-- READ
SELECT * FROM Campuses;

-- UPDATE
UPDATE Campuses
SET Location = 'Lahore H-11 Campus'
WHERE CampusID = 1;

-- DELETE
DELETE FROM Campuses WHERE CampusID = 1;


------------------------------------------------------------
-- 2. Departments
------------------------------------------------------------
-- CREATE
INSERT INTO Departments (CampusID, DeptName)
VALUES (2, 'Data Science');

-- READ
SELECT d.DepartmentID, d.DeptName, c.CampusName
FROM Departments d
JOIN Campuses c 
ON d.CampusID = c.CampusID;

-- UPDATE
UPDATE Departments
SET DeptName = 'Computer Science'
WHERE DepartmentID = 1;

-- DELETE
DELETE FROM Departments WHERE DepartmentID = 1;


------------------------------------------------------------
-- 3. Users
------------------------------------------------------------
-- CREATE
INSERT INTO Users (CampusID, DepartmentID, Name, Email, PasswordHash, Role, CNIC, PhoneNumber)
VALUES (1, 1, 'Ahmad Razi', 'ahmadrazi142@gmail.com', 'hashahmad123', 'Student', '12345-6789012-3', '03001234567');

-- READ
SELECT UserID, Name, Email, Role FROM Users;

-- UPDATE
UPDATE Users
SET PhoneNumber = '03007654321'
WHERE UserID = 1;

-- DELETE
DELETE FROM Users WHERE UserID = 1;


------------------------------------------------------------
-- 4. Student_Details
------------------------------------------------------------
-- CREATE
INSERT INTO Student_Details (UserID, RollNumber, Batch, Semester, Section, AdmissionYear)
VALUES (1, '23L-2575', '2024', 5, 'C', 2022);

-- READ
SELECT s.StudentID, u.Name, s.RollNumber, s.Semester
FROM Student_Details s
JOIN Users u ON s.UserID = u.UserID;

-- UPDATE
UPDATE Student_Details
SET Semester = 6
WHERE StudentID = 1;

-- DELETE
DELETE FROM Student_Details WHERE StudentID = 1;


------------------------------------------------------------
-- 5. Faculty_Details
------------------------------------------------------------
-- CREATE
INSERT INTO Faculty_Details (UserID, Designation, Qualification, JoiningDate)
VALUES (2, 'Assistant Professor', 'PhD Computer Science', '2018-09-01');

-- READ
SELECT f.FacultyID, u.Name, f.Designation, f.Qualification
FROM Faculty_Details f
JOIN Users u ON f.UserID = u.UserID;

-- UPDATE
UPDATE Faculty_Details
SET Designation = 'Professor'
WHERE FacultyID = 1;

-- DELETE
DELETE FROM Faculty_Details WHERE FacultyID = 1;


------------------------------------------------------------
-- 6. Management_Details
------------------------------------------------------------
-- CREATE
INSERT INTO Management_Details (UserID, Position, Responsibility)
VALUES (3, 'Election Officer', 'Supervising campus elections');

-- READ
SELECT m.ManagementID, u.Name, m.Position, m.Responsibility
FROM Management_Details m
JOIN Users u ON m.UserID = u.UserID;

-- UPDATE
UPDATE Management_Details
SET Responsibility = 'Managing Results'
WHERE ManagementID = 1;

-- DELETE
DELETE FROM Management_Details WHERE ManagementID = 1;


------------------------------------------------------------
-- 7. Admin_Details
------------------------------------------------------------
-- CREATE
INSERT INTO Admin_Details (UserID, AccessLevel, LastLogin)
VALUES (4, 'SuperAdmin', GETDATE());

-- READ
SELECT a.AdminID, u.Name, a.AccessLevel, a.LastLogin
FROM Admin_Details a
JOIN Users u ON a.UserID = u.UserID;

-- UPDATE
UPDATE Admin_Details
SET AccessLevel = 'DBAdmin'
WHERE AdminID = 1;

-- DELETE
DELETE FROM Admin_Details WHERE AdminID = 1;


------------------------------------------------------------
-- 8. Elections
------------------------------------------------------------
-- CREATE
INSERT INTO Elections (CampusID, Title, Description, ElectionType, Position, StartDate, EndDate)
VALUES (1, 'Student Council Election 2025', 'Election for student council representatives', 'Student', 'President', '2025-09-01', '2025-09-05');

-- READ
SELECT * FROM Elections;

-- UPDATE
UPDATE Elections
SET IsActive = 0
WHERE ElectionID = 1;

-- DELETE
DELETE FROM Elections WHERE ElectionID = 1;


------------------------------------------------------------
-- 9. Candidates
------------------------------------------------------------
-- CREATE
INSERT INTO Candidates (ElectionID, UserID, Manifesto)
VALUES (1, 1, 'I will improve student facilities and sports activities');

-- READ
SELECT c.CandidateID, u.Name, e.Title, c.Manifesto
FROM Candidates c
JOIN Users u ON c.UserID = u.UserID
JOIN Elections e ON c.ElectionID = e.ElectionID;

-- UPDATE
UPDATE Candidates
SET Manifesto = 'Focus on student welfare and better labs'
WHERE CandidateID = 1;

-- DELETE
DELETE FROM Candidates WHERE CandidateID = 1;


------------------------------------------------------------
-- 10. Votes
------------------------------------------------------------
-- CREATE
INSERT INTO Votes (ElectionID, CandidateID, UserID)
VALUES (1, 1, 2);

-- READ
SELECT v.VoteID, u.Name AS Voter, c.CandidateID, e.Title
FROM Votes v
JOIN Users u ON v.UserID = u.UserID
JOIN Candidates c ON v.CandidateID = c.CandidateID
JOIN Elections e ON v.ElectionID = e.ElectionID;

-- UPDATE
UPDATE Votes
SET CandidateID = 2
WHERE VoteID = 1;

-- DELETE
DELETE FROM Votes WHERE VoteID = 1;


------------------------------------------------------------
-- 11. Results
------------------------------------------------------------
-- CREATE
INSERT INTO Results (ElectionID, CandidateID, TotalVotes)
VALUES (1, 1, 120);

-- READ
SELECT r.ResultID, e.Title, u.Name AS Candidate, r.TotalVotes
FROM Results r
JOIN Elections e ON r.ElectionID = e.ElectionID
JOIN Users u ON r.CandidateID = u.UserID;

-- UPDATE
UPDATE Results
SET TotalVotes = 125
WHERE ResultID = 1;

-- DELETE
DELETE FROM Results WHERE ResultID = 1;
