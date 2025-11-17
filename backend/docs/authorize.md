# SurveyLauncher Enterprise Authorization System

This document provides comprehensive details about the SurveyLauncher authorization middleware, including enterprise-grade RBAC implementation, 9-role permission checking, geographic boundary enforcement, and project-based access control aligned with the enterprise architecture.

## 🏗️ Enterprise Authorization Architecture Overview

The SurveyLauncher system implements a **multi-layered enterprise authorization architecture** that provides fine-grained access control across mobile devices, web admin interfaces, geographic boundaries, and project scoping.

### **Enterprise Architecture Integration**
- **9-Role RBAC System**: Complete enterprise role hierarchy with specialized permissions
- **Geographic Boundaries**: Regional access control based on team operational zones
- **Project-Based Scoping**: Operational boundaries enforced through project assignments
- **Interface Separation**: Mobile vs Web Admin access control with hybrid role support
- **Organizational Boundaries**: Multi-tenant access control across organizations

```
┌─────────────────────────────────────────────────────────────┐
│                  Authorization Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Authentication Layer                     │   │
│  │  • JWT Token Validation                              │   │
│  │  • User Identity Verification                        │   │
│  │  • Session Management                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                             ↓                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Authorization Middleware                  │   │
│  │  • Role Resolution                                   │   │
│  │  • Permission Checking                               │   │
│  │  • Context Validation                                 │   │
│  │  • Access Decision Engine                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                             ↓                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Resource Access Layer                     │   │
│  │  • Route Protection                                  │   │
│  │  • Data Filtering                                    │   │
│  │  • Field-level Security                               │   │
│  │  • Audit Logging                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 👥 Enterprise Role-Based Access Control (RBAC)

### **9-Role System Matrix with Interface Access**

| Role | Mobile Access | Web Admin Access | Geographic Scope | Project Management | Key Permissions |
|------|---------------|------------------|------------------|-------------------|-----------------|
| **TEAM_MEMBER** | ✅ Primary | ❌ Blocked | Assigned project regions | View assigned projects | TELEMETRY.CREATE, DEVICES.READ (own) |
| **FIELD_SUPERVISOR** | ✅ Primary | ✅ Secondary | Assigned project regions | Manage team projects | USERS.READ_TEAM, DEVICES.MANAGE_TEAM, SUPERVISOR_PINS.EXECUTE |
| **REGIONAL_MANAGER** | ✅ Limited | ✅ Primary | Regional project scope | Regional project oversight | USERS.MANAGE_REGIONAL, TEAMS.MANAGE_REGIONAL, PROJECTS.MANAGE_REGIONAL |
| **SYSTEM_ADMIN** | ❌ | ✅ Primary | All regions (NATIONAL) | Full system control | ALL_PERMISSIONS, SYSTEM_SETTINGS.MANAGE, ROLES.ASSIGN |
| **SUPPORT_AGENT** | ❌ | ✅ Primary | Assigned project regions | User assistance | USERS.READ_ASSIGNED, DEVICES.READ_ASSIGNED, SUPPORT_TICKETS.MANAGE |
| **AUDITOR** | ❌ | ✅ Primary | All regions (read-only) | Compliance monitoring | ALL_RESOURCES.READ, AUDIT_LOGS.READ, REPORTS.GENERATE |
| **DEVICE_MANAGER** | ❌ | ✅ Primary | Assigned project regions | Device lifecycle | DEVICES.MANAGE, POLICY.ISSUE, TELEMETRY.READ |
| **POLICY_ADMIN** | ❌ | ✅ Primary | All regions (NATIONAL) | Policy configuration | POLICY.CONFIGURE, POLICY.ISSUE, POLICY.TEMPLATES |
| **NATIONAL_SUPPORT_ADMIN** | ✅ Limited | ✅ Primary | All regions (NATIONAL) | Cross-regional oversight | ALL_REGIONS.ACCESS, CROSS_TEAM_SUPPORT, EMERGENCY.OVERRIDE |

### **Enterprise Permission Matrix**
#### **Field Operations Permissions**
#### **Technical Operations Permissions**

### **Interface Access Rules Implementation**
#### **Mobile Interface Authorization**
#### **Web Admin Interface Authorization**

### **Geographic Boundary Enforcement**
#### **Regional Access Control Middleware**
#### **Team Boundary Validation**

### **Project-Based Access Control**
#### **Project Assignment Validation**


## 🔐 Enhanced Core Authorization Components
### 1. Authentication Middleware (`src/middleware/auth.ts`)
### 2. Enhanced Authorization Middleware (`src/middleware/enhanced-auth.ts`)


## 🔑 Permission Checking Implementation
### Enhanced Authorization Service (`src/services/authorization-service.ts`)

## 🚀 Route Protection Examples
### Mobile API Routes (`src/routes/api/auth.ts`)
### Web Admin API Routes (`src/routes/api/web-admin/auth.ts`)
### Express App Integration (`src/app.ts`)

## Database Query Optimization