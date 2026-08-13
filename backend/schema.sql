-- Create Database
CREATE DATABASE AttendanceDB;
GO

USE AttendanceDB;
GO

-- Create Roles Table
CREATE TABLE Roles (
    RoleID INT PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL
);
GO

INSERT INTO Roles (RoleID, RoleName) VALUES 
(1, 'Employee'),
(2, 'Manager'),
(3, 'HR'),
(4, 'CEO');
GO

-- Create Departments Table
CREATE TABLE Departments (
    DepartmentID INT PRIMARY KEY IDENTITY(1,1),
    DepartmentName NVARCHAR(100) NOT NULL
);
GO

INSERT INTO Departments (DepartmentName) VALUES 
('Engineering'), ('Product'), ('Sales'), ('HR'), ('Data Analytics');
GO

-- Create Employees Table
CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY IDENTITY(1,1),
    EmployeeCode NVARCHAR(50) NULL,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Email NVARCHAR(255) UNIQUE NOT NULL,
    Phone NVARCHAR(20) NULL,
    DepartmentID INT NULL FOREIGN KEY REFERENCES Departments(DepartmentID),
    RoleID INT NOT NULL FOREIGN KEY REFERENCES Roles(RoleID),
    ManagerID INT NULL FOREIGN KEY REFERENCES Employees(EmployeeID),
    Designation NVARCHAR(100) NULL,
    JoiningDate DATE NULL,
    WorkMode NVARCHAR(20) DEFAULT 'WFO', -- 'WFO', 'WFH', 'Hybrid'
    WorkLocation NVARCHAR(100) NULL,
    ProfilePhoto NVARCHAR(MAX) NULL,
    PasswordHash NVARCHAR(MAX) NULL, -- Nullable for invited users who haven't set it yet
    InvitationToken NVARCHAR(255) NULL,
    Status NVARCHAR(20) DEFAULT 'Invited', -- 'Invited', 'Active', 'Inactive'
    HourlyRate DECIMAL(10, 2) NULL,
    TwoFactorSecret NVARCHAR(255) NULL,
    IsTwoFactorEnabled BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Create Sessions Table
CREATE TABLE Sessions (
    SessionID NVARCHAR(255) PRIMARY KEY,
    EmployeeID INT NOT NULL FOREIGN KEY REFERENCES Employees(EmployeeID),
    TokenHash NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    ExpiresAt DATETIME NOT NULL,
    LastActivityAt DATETIME DEFAULT GETDATE(),
    IPAddress NVARCHAR(50) NULL,
    UserAgent NVARCHAR(MAX) NULL,
    RevokedAt DATETIME NULL
);
GO

-- Create Attendance Table
CREATE TABLE Attendance (
    AttendanceID INT PRIMARY KEY IDENTITY(1,1),
    EmployeeID INT NOT NULL FOREIGN KEY REFERENCES Employees(EmployeeID),
    AttendanceDate DATE NOT NULL,
    ClockIn DATETIME NOT NULL DEFAULT GETDATE(),
    ClockOut DATETIME NULL,
    WorkMode NVARCHAR(20) DEFAULT 'WFO',
    Status NVARCHAR(50) NOT NULL,
    IPAddress NVARCHAR(50) NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Create Leaves Table
CREATE TABLE LeaveRequests (
    RequestID INT PRIMARY KEY IDENTITY(1,1),
    EmployeeID INT NOT NULL FOREIGN KEY REFERENCES Employees(EmployeeID),
    LeaveType NVARCHAR(50) NOT NULL,
    RequestDate DATE NOT NULL,
    Reason NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) DEFAULT 'Pending'
);
GO

-- Create Notifications Table
CREATE TABLE Notifications (
    NotificationID INT PRIMARY KEY IDENTITY(1,1),
    EmployeeID INT NOT NULL FOREIGN KEY REFERENCES Employees(EmployeeID),
    Message NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO
