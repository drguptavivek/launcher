# Regional Manager Guide

*Regional oversight and multi-team management*

## 🎯 Your Role: REGIONAL_MANAGER

- **Interfaces**: Mobile app + Web dashboard
- **Access**: All teams and projects in your region
- **Can Create**: Regional projects, supervisor accounts, team assignments
- **Reports to**: National Support Admin / System Admin

---

## 📱 Mobile App Access

### **Your Credentials**
- **Device ID**: Pre-configured device
- **User Code**: Given by admin (like "MGR001")
- **PIN**: 4-6 digit number you create

### **Mobile Tasks**
- Field visits and site inspections
- Real-time regional monitoring
- On-site supervisor support
- Quality assurance audits

---

## 💻 Web Dashboard Access

### **Your Credentials**
- **Email**: Created by system admin
- **Password**: Set by admin
- **2FA**: Required

### **Web Capabilities**
- Manage all teams in your region
- Create regional projects
- Monitor supervisor performance
- Generate regional reports

---

## 🗺️ Regional Scope

### **Your Geographic Area**
- **Multiple States**: All states in your assigned region
- **All Teams**: Every team within your regional boundaries
- **Cannot Access**: Other regions or national-level functions

### **Regional Structure**
```
Your Region
├── State A
│   ├── Team Alpha (Field Supervisor)
│   └── Team Beta (Field Supervisor)
└── State B
    ├── Team Gamma (Field Supervisor)
    └── Team Delta (Field Supervisor)
```

---

## 👥 Multi-Team Management

### **What You Can Manage**
- **Create**: FIELD_SUPERVISOR accounts
- **Assign**: Supervisors to teams
- **Monitor**: All team performance metrics
- **Reassign**: Teams and resources across region

### **Supervisor Creation**
1. Go to Users → Create User
2. Select role: FIELD_SUPERVISOR
3. Assign to state/teams
4. Set credentials and permissions
5. Define supervisor scope

---

## 📊 Regional Project Management

### **Project Scopes You Can Create**
- **REGIONAL**: Multiple teams across your region
- **NATIONAL**: Requires national admin approval

### **Regional Project Creation**
1. Go to Projects → Create Project
2. Set title and abbreviation
3. Choose scope: REGIONAL
4. Assign multiple teams
5. Set regional timeline

---

## 📈 Performance Monitoring

### **Regional Metrics**
- Team performance comparisons
- Cross-team productivity analysis
- Regional completion rates
- Supervisor effectiveness scores

### **Reports You Can Generate**
- Regional performance summaries
- Team-to-team comparisons
- Supervisor evaluations
- Resource utilization reports

---

## 🏢 Field Operations

### **Regional Visits**
- Schedule team inspections
- Conduct supervisor audits
- Verify data quality
- Address regional issues

### **Quality Assurance**
- Standard enforcement across teams
- Best practice identification
- Performance benchmarking
- Compliance verification

---

## ✅ Weekly Checklist

### **Mobile App**
- [ ] Log in during field visits
- [ ] Monitor team GPS activity
- [ ] Complete site inspections
- [ ] Document observations
- [ ] Upload field data

### **Web Dashboard**
- [ ] Review all team performance
- [ ] Analyze regional metrics
- [ ] Handle escalations
- [ ] Generate weekly reports
- [ ] Plan resource allocation

---

## 🔑 Your Permission Matrix

| Feature | Mobile | Web | Scope |
|---------|--------|-----|-------|
| **Field Work** | ✅ | ❌ | Your tasks |
| **All Teams** | ✅ | ✅ | Your region |
| **Supervisor Management** | ❌ | ✅ | Create/manage |
| **Regional Projects** | ❌ | ✅ | Create/manage |
| **National Projects** | ❌ | 👁️ | View if assigned |
| **Cross-Regional Reports** | ❌ | ✅ | Your region only |
| **System Configuration** | ❌ | ❌ | Not available |

---

## 🚨 Escalation Management

### **When to Escalate**
- Region-wide technical issues
- Cross-state resource conflicts
- Major compliance violations
- Emergency situations

### **Escalation Path**
1. Document issue thoroughly
2. Attempt regional resolution
3. Contact National Support Admin
4. Follow national procedures

---

## 📞 Support Contacts

- **Your Manager**: National Support Admin
- **Technical Support**: Support Agent
- **System Issues**: System Admin
- **Policy Questions**: Policy Admin