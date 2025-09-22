# QuoteMaster - Technical Specification

## 1. Overview

QuoteMaster is a comprehensive procurement and supply chain management system designed for multi-location food service operations. The system provides quote management, supplier coordination, kitchen demand forecasting, and staff management capabilities.

## 2. Architecture

### 2.1. Technology Stack
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Backend**: Next.js API Routes with Server Actions
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom session-based authentication with bcrypt
- **UI**: shadcn/ui components with Tailwind CSS
- **Validation**: Zod schemas for type-safe validation

### 2.2. Core Principles
- **Team-based Organization**: All operations are organized around teams (Office, Kitchen)
- **Role-based Access Control**: Pure team-based RBAC with contextual permissions
- **Vietnamese Localization**: Full Vietnamese language support throughout the UI
- **Multi-tenant Architecture**: Support for multiple kitchen locations with centralized management

## 3. Data Model

### 3.1. Core Entities
- **Users**: Staff members with team assignments and role-based permissions
- **Teams**: Organizational units (Office teams for administration, Kitchen teams for locations)
- **Suppliers**: External vendors providing products
- **Products**: Items that can be procured from suppliers
- **Quotes**: Price requests and responses between teams and suppliers

### 3.2. Relationships
- Users belong to multiple Teams through TeamMembers (many-to-many)
- Teams can manage multiple Suppliers and Products
- Kitchen Teams generate demand forecasts for Products
- Office Teams coordinate with Suppliers to fulfill Kitchen demands

## 4. Database Schema

### 4.1. Users Table (Core Authentication)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  employee_code VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  job_title VARCHAR(100),
  department VARCHAR(50),
  hire_date DATE,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP
);
```

### 4.2. Teams Table
```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  team_type VARCHAR(20) DEFAULT 'OFFICE' NOT NULL,
  region VARCHAR(100),
  address TEXT,
  manager_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP
);
```

### 4.3. Team Members Table (RBAC Core)
```sql
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, team_id)
);
```

## 5. Authentication & Authorization

### 5.1. Session Management
- Custom session-based authentication using secure HTTP-only cookies
- bcrypt password hashing with salt rounds
- Session tokens stored securely with expiration handling
- CSRF protection through SameSite cookie attributes

### 5.2. Password Security
- Minimum 8 characters with complexity requirements
- bcrypt hashing with configurable salt rounds
- Secure password generation for new staff accounts
- Password reset functionality with time-limited tokens

## 6. Business Logic

### 6.1. Kitchen Operations
- **Demand Forecasting**: Kitchen teams input periodic demand requirements
- **Menu Planning**: Integration with product catalog for menu development
- **Inventory Management**: Track current inventory levels and consumption patterns
- **Regional Coordination**: Multi-location kitchen management with regional grouping

### 6.2. Procurement Workflow
- **Quote Requests**: Kitchen teams request quotes for specific products
- **Supplier Coordination**: Office teams coordinate with suppliers for pricing
- **Quote Comparison**: Side-by-side analysis of supplier quotes
- **Procurement Decisions**: Approval workflow for purchase decisions

### 6.3. Staff Management
- **User Lifecycle**: Complete CRUD operations for staff members
- **Team Assignments**: Dynamic assignment of staff to multiple teams
- **Role Management**: Contextual role assignments within teams
- **Department Organization**: Staff categorization by functional departments

## 7. Database Schema Extensions

### 7.1. Template Foundation
QuoteMaster extends a base SaaS template that provides:
- Basic user authentication and session management
- Team/organization structure with member management
- Subscription and payment processing capabilities
- Activity logging and audit trails

### 7.2. QuoteMaster-Specific Extensions
The following tables and fields have been added to support procurement operations:

#### 7.2.1. Enhanced Teams Structure
- `team_type`: Distinguishes between 'OFFICE' and 'KITCHEN' teams
- `region`: Geographic organization for kitchen locations
- `address`: Physical location information
- `manager_id`: Team leadership assignment

#### 7.2.2. Suppliers Management
- Complete supplier information with contact details
- Tax identification and legal compliance fields
- Supplier performance tracking capabilities

#### 7.2.3. Product Catalog
- Comprehensive product definitions with categories
- Unit specifications for accurate quantity management
- Supplier relationships for pricing coordination

#### 7.2.4. Demand Forecasting
- Period-based demand requirements from kitchen teams
- Historical demand tracking for trend analysis
- Integration with procurement planning workflows

### 7.3. Template Schema Extensions

#### Users Table (Extended from Template)
The original template's `users` table has been extended with procurement-specific fields while maintaining compatibility with the base authentication system.

**IMPORTANT**: The `role` column from the original template has been **removed** from the QuoteMaster implementation.

**Justification**: The `users.role` column is removed to enforce a pure team-based RBAC model. A user's permissions are now exclusively determined by their roles within specific teams, as defined in the `team_members` table. This creates a more flexible, context-aware, and consistent authorization system that better supports multi-tenant operations and complex organizational structures.

**Added Fields**:
- `employee_code`: Unique identifier for HR integration
- `phone`: Contact information for team coordination
- `job_title`: Professional role description
- `department`: Functional department assignment
- `hire_date`: Employment start date for HR tracking
- `status`: Employment status (active, inactive, terminated)

**Compatibility**: Legacy authentication flows continue to work, with role-based permissions now exclusively managed through the `team_members` table.

## 8. Role-Based Access Control (RBAC)

### 8.1. RBAC Overview
QuoteMaster implements a sophisticated Role-Based Access Control system that governs all user permissions and data access within the application. This system is designed to support complex organizational structures while maintaining security and operational flexibility.

### 8.2. Permission Categories
The system defines the following permission categories:

#### 8.2.1. Quote Management
- `canViewQuotes`: Access to view quote information
- `canCreateQuotes`: Ability to initiate quote requests
- `canApproveQuotes`: Authority to approve procurement decisions
- `canNegotiateQuotes`: Permission to engage in supplier negotiations

#### 8.2.2. Resource Management
- `canManageProducts`: Control over product catalog
- `canManageSuppliers`: Supplier relationship management
- `canManageKitchens`: Kitchen team administration
- `canManageStaff`: Staff and user management

#### 8.2.3. Analytics & Reporting
- `canViewAnalytics`: Access to system analytics and reports
- `canExportData`: Permission to export data for external analysis

#### 8.2.4. Access Control
- `teamRestricted`: Determines if user access is limited to assigned teams

### 8.3. Enhanced Role System

QuoteMaster implements a **pure team-based RBAC model** that serves as the definitive authorization framework for all system operations. This model is built on three fundamental principles:

#### Principle 1: `team_members` as the Single Source of Truth

**Core Concept**: A user has **no permissions by default**. All permissions are exclusively granted through records in the `team_members` table.

**Implementation Details**:
- The `users` table contains no role or permission information
- User permissions are calculated dynamically by aggregating roles from all team memberships
- A user without team memberships has no system access beyond basic authentication
- Permission checks always query the `team_members` table to determine current access levels

**Example**:
```sql
-- User with no team memberships = no permissions
SELECT * FROM team_members WHERE user_id = 123;
-- Returns empty result = user has no system access

-- User with team membership = permissions based on role
SELECT role FROM team_members WHERE user_id = 123;
-- Returns: ['KITCHEN_MANAGER'] = kitchen management permissions
```

#### Principle 2: Contextual Roles

**Core Concept**: Roles like `KITCHEN_MANAGER` are context-dependent and only apply within the scope of the assigned team.

**Implementation Details**:
- Each role grants specific permissions only within the context of the associated team
- A `KITCHEN_MANAGER` in Team A has no authority over Team B
- Users can have different roles in different teams simultaneously
- Permission checks must always consider both the role and the team context

**Role Hierarchy by Team Type**:

**Kitchen Teams (team_type = 'KITCHEN')**:
- `KITCHEN_MANAGER`: Full management of assigned kitchen operations
- `KITCHEN_STAFF`: Standard kitchen operational access
- `KITCHEN_VIEWER`: Read-only access to kitchen data

**Office Teams (team_type = 'OFFICE')**:
- `ADMIN_SUPER_ADMIN`: System-wide administrative privileges
- `ADMIN_MANAGER`: Administrative management within office scope
- `ADMIN_STAFF`: Standard administrative access
- `ADMIN_VIEWER`: Read-only administrative access

**Department-Specific Office Roles**:
- `PROCUREMENT_SUPER_ADMIN`: Full procurement system control
- `PROCUREMENT_MANAGER`: Procurement workflow management
- `PROCUREMENT_STAFF`: Standard procurement operations
- `ACCOUNTING_MANAGER`: Financial oversight and reporting
- `ACCOUNTING_STAFF`: Financial data entry and processing
- `OPERATIONS_MANAGER`: Operational workflow coordination
- `OPERATIONS_STAFF`: Operational task execution

**Example Contextual Authorization**:
```typescript
// User has KITCHEN_MANAGER role in Kitchen Team #5
// This grants kitchen management permissions ONLY for Kitchen #5
// No permissions for Kitchen #6 or any Office teams

const permissions = await getUserPermissions(userId, teamId: 5);
// Returns: kitchen management permissions for Team #5

const permissions = await getUserPermissions(userId, teamId: 6);
// Returns: no permissions (user not assigned to Team #6)
```

#### Principle 3: Cross-Tenant Permissions via a "Special Team"

**Core Concept**: System-wide (cross-tenant) permissions, like those for a Super Admin, are granted by assigning a user a high-privilege role (e.g., `ADMIN_SUPER_ADMIN`) within a designated special team (e.g., the "Office Team").

**Implementation Details**:
- Cross-tenant permissions are implemented through a special "Office Team" with `team_type = 'OFFICE'`
- Users assigned to the Office Team with `ADMIN_SUPER_ADMIN` role gain system-wide access
- This maintains the team-based model while enabling global administrative functions
- The Office Team serves as the central administrative hub for the entire organization

**Special Team Structure**:
```sql
-- Office Team: The special team for system-wide permissions
INSERT INTO teams (name, team_type, status) VALUES
('Văn Phòng Trung Tâm', 'OFFICE', 'active');

-- Super Admin Assignment: Grants system-wide access
INSERT INTO team_members (user_id, team_id, role) VALUES
(1, office_team_id, 'ADMIN_SUPER_ADMIN');
```

**Permission Resolution Logic**:
1. **Check Office Team Membership**: If user has `ADMIN_SUPER_ADMIN` role in Office Team → grant system-wide access
2. **Check Contextual Team Membership**: For specific team operations → verify role within that team
3. **Apply Restrictions**: If neither condition met → deny access

**Example System-Wide Access**:
```typescript
// Super Admin in Office Team can access all kitchens
const userWithTeams = await getUserWithTeams(userId);
const hasAdminRole = userWithTeams.teams.some(tm =>
  tm.team.teamType === 'OFFICE' && tm.role === 'ADMIN_SUPER_ADMIN'
);

if (hasAdminRole) {
  // Grant access to all kitchen teams and administrative functions
  return getAllKitchens();
}
```

#### 8.3.4. Authorization Flow

**Step 1: Authentication**
- Verify user session and identity
- Confirm user account is active and not deleted

**Step 2: Team Membership Resolution**
- Query all team memberships for the authenticated user
- Aggregate roles across all assigned teams

**Step 3: Permission Calculation**
- For each team membership, resolve role-specific permissions
- Apply team context to limit scope of permissions
- Check for special Office Team membership for system-wide access

**Step 4: Access Decision**
- Compare required permissions against user's calculated permissions
- Consider team context for resource-specific operations
- Grant or deny access based on complete permission profile

**Step 5: Data Filtering**
- Apply team-based data restrictions for non-admin users
- Ensure users only access data from their assigned teams
- Provide full data access for users with system-wide permissions

#### 8.3.5. Security Benefits

**Principle of Least Privilege**: Users receive only the minimum permissions necessary for their assigned responsibilities within specific team contexts.

**Separation of Concerns**: Different functional areas (Kitchen operations, Procurement, Accounting) are isolated through team-based access control.

**Scalability**: New teams and roles can be added without modifying core authorization logic.

**Auditability**: All permission grants are explicitly recorded in the `team_members` table with timestamps.

**Flexibility**: Users can be assigned to multiple teams with different roles, supporting complex organizational structures.

**Context Awareness**: Permissions are always evaluated within the context of specific teams, preventing unauthorized cross-team access.

This definitive RBAC model ensures that QuoteMaster can support complex organizational hierarchies while maintaining strict security boundaries and operational flexibility.

## 9. API Design

### 9.1. RESTful Endpoints
- `/api/staff` - Staff management operations
- `/api/teams` - Team administration
- `/api/suppliers` - Supplier relationship management
- `/api/products` - Product catalog management
- `/api/quotes` - Quote request and response handling

### 9.2. Server Actions
- Type-safe server actions for form submissions
- Zod schema validation for all inputs
- Comprehensive error handling with user-friendly messages
- Revalidation and cache management for optimal performance

### 9.3. Authorization Middleware
- Permission checking for all API endpoints
- Team-based data filtering for security
- Role validation against action requirements
- Audit logging for security monitoring

## 10. User Interface

### 10.1. Design System
- **Component Library**: shadcn/ui with Tailwind CSS
- **Design Principles**: Clean, professional, data-dense interfaces
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Accessibility**: WCAG 2.1 AA compliance for inclusive access

### 10.2. Vietnamese Localization
- **Language Support**: Complete Vietnamese text throughout the application
- **Cultural Adaptation**: Date formats, currency display, and business terminology
- **Input Validation**: Vietnamese-specific validation messages and formats
- **User Experience**: Intuitive navigation using familiar Vietnamese business concepts

### 10.3. Key User Flows
- **Staff Management**: Complete CRUD operations with role assignment
- **Supplier Coordination**: Onboarding, relationship management, and performance tracking
- **Quote Processing**: Request creation, supplier response, and approval workflows
- **Reporting**: Analytics dashboards with export capabilities

## 11. Security & Compliance

### 11.1. Data Security
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Multi-layered authorization with team-based restrictions
- **Audit Trails**: Comprehensive logging of all user actions and system events
- **Data Validation**: Server-side validation for all inputs with SQL injection prevention

### 11.2. Privacy Protection
- **Personal Data**: Minimal collection with explicit consent
- **Data Retention**: Automated cleanup of expired sessions and temporary data
- **User Rights**: Self-service data access and correction capabilities
- **Compliance**: Adherence to applicable Vietnamese data protection regulations

## 12. Performance & Scalability

### 12.1. Database Optimization
- **Indexing Strategy**: Optimized indexes for common query patterns
- **Query Optimization**: Efficient joins and subqueries for complex relationships
- **Connection Pooling**: Managed database connections for high concurrency
- **Caching**: Strategic caching of frequently accessed data

### 12.2. Application Performance
- **Code Splitting**: Dynamic imports for optimal bundle sizes
- **Server-Side Rendering**: Next.js SSR for improved initial load times
- **Image Optimization**: Automatic image compression and format selection
- **CDN Integration**: Static asset delivery optimization

## 13. Deployment & Operations

### 13.1. Infrastructure
- **Platform**: Cloud-native deployment with container orchestration
- **Database**: Managed PostgreSQL with automated backups
- **Monitoring**: Application performance monitoring with alerting
- **Logging**: Centralized log aggregation and analysis

### 13.2. Development Workflow
- **Version Control**: Git-based workflow with feature branching
- **CI/CD**: Automated testing and deployment pipelines
- **Environment Management**: Separate development, staging, and production environments
- **Database Migrations**: Version-controlled schema changes with rollback capabilities

---

*This specification serves as the definitive technical reference for QuoteMaster development and maintenance. All implementation decisions should align with the principles and patterns defined in this document.*