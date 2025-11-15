# System Administrator Guide

*Full system access and configuration*

## 🎯 Your Role: SYSTEM_ADMIN

- **Interface**: Web dashboard ONLY
- **Access**: Complete system control
- **Can Create**: Users, projects, teams, devices
- **Cannot**: Use mobile app

---

## 💻 Web Dashboard Login

### **Your Credentials**
- **Email**: Created by organization
- **Password**: Set by admin
- **2FA**: May be required

### **First-Time Setup**
1. Go to SurveyLauncher web URL
2. Enter email and password
3. Set up 2-factor authentication
4. Complete profile setup

---

## 👥 User Management

### **Create Web Admin Users**
1. Go to Users → Create User
2. Select role (except TEAM_MEMBER)
3. Enter email and name
4. Set temporary password
5. Assign initial projects/teams

### **Create Mobile Users**
1. Go to Teams → Select team
2. Add new users
3. Assign user codes
4. Set up initial PINs
5. Register devices

### **User Roles You Can Create**
- **FIELD_SUPERVISOR**: Team management + mobile access
- **REGIONAL_MANAGER**: Regional oversight + mobile access
- **SUPPORT_AGENT**: User help (web only)
- **AUDITOR**: Read-only access (web only)
- **DEVICE_MANAGER**: Device management (web only)
- **POLICY_ADMIN**: Rules and policies (web only)
- **NATIONAL_SUPPORT_ADMIN**: Multi-region access (web only)
- **SYSTEM_ADMIN**: Full access (web only)

**Cannot create**: TEAM_MEMBER (mobile only)

---

## 📊 Project Management

### **Create Projects**
1. Go to Projects → Create Project
2. Set title and abbreviation
3. Choose geographic scope:
   - **LOCAL**: Single team
   - **REGIONAL**: Multiple teams same region
   - **NATIONAL**: All teams
4. Assign teams or individual users
5. Set start/end dates

### **Project Permissions**
- **MANAGE**: Full control
- **EXECUTE**: Complete tasks
- **VIEW**: Read-only access

---

## 🏢 Team Management

### **Create Teams**
1. Go to Teams → Create Team
2. Set team name
3. Assign geographic location (State)
4. Add team members
5. Assign supervisor

### **Geographic Structure**
- Teams organized by State
- States grouped into Regions
- Projects scoped accordingly

---

## 📱 Device Management

### **Register Devices**
1. Get Android device ID
2. Assign to team
3. Set device name
4. Configure app settings
5. Deploy to users

### **Monitor Devices**
- Track device status
- View last seen/last GPS
- Monitor battery levels
- Update app versions

---

## 🔒 Security Administration

### **Account Security**
- Force password changes
- Set password policies
- Monitor failed logins
- Lock/unlock accounts

### **System Security**
- Review audit logs
- Monitor access patterns
- Update security policies
- Manage API keys

---

## 📈 System Monitoring

### **Dashboard Overview**
- User activity stats
- System performance metrics
- Database health status
- Error rate monitoring

### **Reports You Can Generate**
- User activity reports
- Project completion statistics
- Device usage analytics
- Security audit reports

---

## 🔧 Configuration

### **System Settings**
- Time zones
- Work schedules
- GPS settings
- Telemetry rules

### **Policies**
- Password policies
- Access rules
- Data retention
- Compliance settings

---

## ❓ Common Admin Tasks

### **Reset User Passwords**
1. Find user in User Management
2. Click "Reset Password"
3. User receives email with reset link
4. Temporary password expires in 24 hours

### **Manage Device Assignments**
1. Go to Device Management
2. Select device
3. Reassign to different team
4. Update user notifications

### **Project Cleanup**
1. Archive completed projects
2. Remove user assignments
3. Update project status
4. Generate completion reports

---

## ✅ Admin Checklist

### **Daily**
- [ ] Monitor system health
- [ ] Review failed logins
- [ ] Check user activity
- [ ] Backup critical data

### **Weekly**
- [ ] Review user access needs
- [ ] Update device inventory
- [ ] Generate reports
- [ ] Check system updates

### **Monthly**
- [ ] Review role assignments
- [ ] Audit project permissions
- [ ] Update security policies
- [ ] Plan system maintenance

---

## 📞 Support Contacts

- **Technical Support**: [Fill in contact]
- **Emergency**: [Fill in emergency procedure]
- **Documentation**: This user guide