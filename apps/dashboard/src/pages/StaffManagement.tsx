import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Building2,
  UserPlus,
  Plus,
  Shield,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  KeyRound,
  Clock,
  Sun,
  Sunset,
  Moon,
  CalendarCheck,
  Download,
  UserCheck,
  Timer,
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../components/ui/Toast';
import {
  getAllAuthUsers,
  saveCustomAuthUser,
  savePasswordOverride,
  type AuthUser,
} from '../context/AuthContext';
import { formatMoney } from '../lib/money';
import Modal from '../components/ui/Modal';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  managerName?: string;
  employeeCount?: number;
}

export type ShiftType = 'morning' | 'evening' | 'night' | 'general';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  photoUrl?: string;
  mobile: string;
  email: string;
  address?: string;
  joiningDate: string;
  departmentId?: string;
  departmentName?: string;
  designation: string;
  reportingManager?: string;
  salary: number;
  role: string;
  shift?: ShiftType;
  status: 'active' | 'inactive' | 'on_leave';
}

export const SHIFT_DETAILS: Record<ShiftType, { name: string; hours: string; badge: string; icon: string }> = {
  morning: {
    name: 'Morning Shift',
    hours: '06:00 AM – 02:00 PM',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: '🌅',
  },
  evening: {
    name: 'Evening Shift',
    hours: '02:00 PM – 10:00 PM',
    badge: 'bg-blue-100 text-blue-900 border-blue-300',
    icon: '🌆',
  },
  night: {
    name: 'Night Shift',
    hours: '10:00 PM – 06:00 AM',
    badge: 'bg-purple-100 text-purple-900 border-purple-300',
    icon: '🌙',
  },
  general: {
    name: 'General Shift',
    hours: '09:00 AM – 06:00 PM',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: '☀️',
  },
};

const ROLES_LIST = [
  'Hotel Admin / Owner',
  'Front Office Manager',
  'Receptionist',
  'Accountant',
  'Housekeeping Manager',
  'Housekeeping Staff',
  'Maintenance Staff',
  'Other Employees',
];

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  shift: ShiftType;
  clockInTime: string;
  clockOutTime?: string;
  workingHours: number;
  status: 'present' | 'on_duty' | 'completed' | 'absent';
}

export default function StaffManagement() {
  const { propertyId, currencyCode } = useProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'employees' | 'departments' | 'credentials' | 'attendance'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'all' | ShiftType>('all');
  const [credVersion, setCredVersion] = useState(0);

  // Daily Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('hotel_spark_daily_attendance');
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'att-1',
        employeeId: 'ADM001',
        name: 'Banu Prasad (Owner)',
        role: 'Hotel Owner & Super Admin',
        department: 'Management',
        shift: 'morning',
        clockInTime: '08:30 AM',
        clockOutTime: undefined,
        workingHours: 7.2,
        status: 'on_duty',
      },
      {
        id: 'att-2',
        employeeId: 'MGR001',
        name: 'Ramesh Rao',
        role: 'Hotel General Manager',
        department: 'Management',
        shift: 'morning',
        clockInTime: '07:00 AM',
        clockOutTime: undefined,
        workingHours: 8.5,
        status: 'on_duty',
      },
      {
        id: 'att-3',
        employeeId: 'FO001',
        name: 'Priya Sharma (FO1)',
        role: 'Front Office Executive 1 (Morning)',
        department: 'Front Office',
        shift: 'morning',
        clockInTime: '06:55 AM',
        clockOutTime: '03:05 PM',
        workingHours: 8.1,
        status: 'completed',
      },
      {
        id: 'att-4',
        employeeId: 'FO002',
        name: 'Kiran Varma (FO2)',
        role: 'Front Office Executive 2 (Evening)',
        department: 'Front Office',
        shift: 'evening',
        clockInTime: '02:50 PM',
        clockOutTime: undefined,
        workingHours: 3.5,
        status: 'on_duty',
      },
      {
        id: 'att-5',
        employeeId: 'FO003',
        name: 'Rahul Verma (FO3)',
        role: 'Front Office Executive 3 (Night)',
        department: 'Front Office',
        shift: 'night',
        clockInTime: 'Scheduled 11:00 PM',
        clockOutTime: undefined,
        workingHours: 0,
        status: 'absent',
      },
      {
        id: 'att-6',
        employeeId: 'EMP-SPARK-005',
        name: 'Kavitha Devi',
        role: 'Housekeeping Manager',
        department: 'Housekeeping',
        shift: 'morning',
        clockInTime: '07:30 AM',
        clockOutTime: '04:00 PM',
        workingHours: 8.5,
        status: 'completed',
      },
      {
        id: 'att-7',
        employeeId: 'EMP-SPARK-006',
        name: 'Sunil Kumar',
        role: 'Hotel Accountant',
        department: 'Accounts',
        shift: 'general',
        clockInTime: '09:00 AM',
        clockOutTime: '06:00 PM',
        workingHours: 9.0,
        status: 'completed',
      },
    ];
  });

  const downloadAttendanceCSV = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const headers = ['Date', 'Employee ID', 'Staff Name', 'Role', 'Department', 'Shift', 'Clock In', 'Clock Out', 'Working Hours', 'Status'];
    const rows = attendanceRecords.map((r) => [
      todayStr,
      `"${r.employeeId}"`,
      `"${r.name}"`,
      `"${r.role}"`,
      `"${r.department}"`,
      `"${SHIFT_DETAILS[r.shift]?.name || r.shift}"`,
      `"${r.clockInTime}"`,
      `"${r.clockOutTime || 'Active On Duty'}"`,
      r.workingHours,
      `"${r.status.toUpperCase()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hotel_Spark_Attendance_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('success', 'Attendance CSV report downloaded successfully.');
  };

  const toggleAttendanceStatus = (id: string) => {
    const updated = attendanceRecords.map((r) => {
      if (r.id === id) {
        if (r.status === 'on_duty' || r.status === 'present') {
          const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          return {
            ...r,
            clockOutTime: nowTime,
            status: 'completed' as const,
          };
        } else {
          const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          return {
            ...r,
            clockInTime: nowTime,
            clockOutTime: undefined,
            status: 'on_duty' as const,
          };
        }
      }
      return r;
    });
    setAttendanceRecords(updated);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('hotel_spark_daily_attendance', JSON.stringify(updated));
    }
    toast('success', 'Staff attendance updated successfully.');
  };

  // Credential Management State
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedCredUser, setSelectedCredUser] = useState<any | null>(null);
  const [newCredName, setNewCredName] = useState('');
  const [newCredEmail, setNewCredEmail] = useState('');
  const [newCredEmpId, setNewCredEmpId] = useState('');
  const [newCredRole, setNewCredRole] = useState<'admin' | 'manager' | 'front_office'>('front_office');
  const [newCredPassword, setNewCredPassword] = useState('SparkHotel@2026');
  const [newResetPassword, setNewResetPassword] = useState('SparkHotel@2026');
  const [credActionLoading, setCredActionLoading] = useState(false);
  const [deactivatedUsers, setDeactivatedUsers] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return JSON.parse(window.localStorage.getItem('hotel_spark_deactivated_users') || '[]');
      }
    } catch {
      // ignore
    }
    return [];
  });

  const allCredUsers = useMemo(() => {
    const list = getAllAuthUsers();
    const map = new Map<string, any>();
    for (const u of list) {
      const emailLower = u.email.toLowerCase();
      if (!map.has(emailLower)) {
        map.set(emailLower, {
          id: u.sub,
          employeeId: u.employeeId || 'STAFF',
          name: u.name,
          email: u.email,
          role: u.roles.includes('admin') ? 'admin' : u.roles.includes('manager') ? 'manager' : 'front_office',
          roleTitle:
            u.roleTitle ||
            (u.roles.includes('admin')
              ? 'Hotel Owner & Super Admin'
              : u.roles.includes('manager')
                ? 'Hotel General Manager'
                : 'Front Office Executive'),
          dashboardRoute: u.roles.includes('admin') ? '/admin' : u.roles.includes('manager') ? '/manager' : '/front-office',
          department: u.department || (u.roles.includes('admin') || u.roles.includes('manager') ? 'Management' : 'Front Office'),
        });
      }
    }
    return Array.from(map.values());
  }, [credModalOpen, resetModalOpen, deactivatedUsers, credVersion]);

  const handleCreateCredential = async () => {
    if (!newCredName.trim() || !newCredEmail.trim()) {
      toast('error', 'Please enter employee name and valid email.');
      return;
    }
    setCredActionLoading(true);
    try {
      const cleanEmail = newCredEmail.trim().toLowerCase();
      const empIdentifier = newCredEmpId.trim().toUpperCase() || `EMP-${Date.now().toString().slice(-4)}`;
      const roleTitle =
        newCredRole === 'admin'
          ? 'Hotel Owner & Super Admin'
          : newCredRole === 'manager'
            ? 'Hotel General Manager'
            : 'Front Office Executive';

      saveCustomAuthUser(
        {
          sub: `usr-${Date.now()}`,
          email: cleanEmail,
          name: newCredName.trim(),
          employeeId: empIdentifier,
          roleTitle,
          department: newCredRole === 'admin' || newCredRole === 'manager' ? 'Management' : 'Front Office',
          roles: [
            newCredRole,
            ...(newCredRole === 'admin' ? ['general_manager', 'front_desk'] : newCredRole === 'manager' ? ['front_desk'] : []),
          ],
        },
        newCredPassword.trim() || 'SparkHotel@2026'
      );

      // Also create employee record so they show in both tabs
      await api.post('/v1/employees', {
        propertyId,
        employeeId: empIdentifier,
        name: newCredName.trim(),
        mobile: '9876543210',
        email: cleanEmail,
        departmentName: newCredRole === 'admin' || newCredRole === 'manager' ? 'Management' : 'Front Office',
        designation: roleTitle,
        salary: newCredRole === 'admin' ? 100000 : newCredRole === 'manager' ? 60000 : 35000,
        role: roleTitle,
        shift: 'morning',
        status: 'active',
        joiningDate: new Date().toISOString().split('T')[0],
      });

      setCredVersion((v) => v + 1);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast('success', `Staff credential for ${newCredName} (${empIdentifier}) created successfully!`);
      setCredModalOpen(false);
      setNewCredName('');
      setNewCredEmail('');
    } catch (e: any) {
      toast('error', 'Failed to create employee credential.');
    } finally {
      setCredActionLoading(false);
    }
  };

  const handleResetPassword = () => {
    if (!selectedCredUser || !newResetPassword.trim()) {
      toast('error', 'Please enter a valid password.');
      return;
    }
    savePasswordOverride(selectedCredUser.email, newResetPassword.trim());
    toast('success', `Password for ${selectedCredUser.name} (${selectedCredUser.email}) updated successfully!`);
    setCredVersion((v) => v + 1);
    setResetModalOpen(false);
    setSelectedCredUser(null);
  };

  // Modals
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // New Employee Form State
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [empMobile, setEmpMobile] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empAddress, setEmpAddress] = useState('');
  const [empDepartmentId, setEmpDepartmentId] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(35000);
  const [empRole, setEmpRole] = useState(ROLES_LIST[2]); // Receptionist
  const [empShift, setEmpShift] = useState<ShiftType>('morning');
  const [empStatus, setEmpStatus] = useState<'active' | 'inactive'>('active');

  // New Department Form State
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptManager, setDeptManager] = useState('');

  // Fetch Departments
  const { data: departments = [], isLoading: isLoadingDepts } = useQuery<Department[]>({
    queryKey: ['departments', propertyId],
    queryFn: async () => {
      const res = await api.get('/v1/departments', { params: { propertyId } });
      return res.data;
    },
  });

  // Fetch Employees
  const { data: employees = [], isLoading: isLoadingEmps } = useQuery<Employee[]>({
    queryKey: ['employees', propertyId],
    queryFn: async () => {
      const res = await api.get('/v1/employees', { params: { propertyId } });
      return res.data;
    },
  });

  // Save Employee Mutation
  const saveEmployeeMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        propertyId,
        id: editingEmployee?.id,
        employeeId: empId || `EMP-SPARK-${Math.floor(100 + Math.random() * 900)}`,
        name: empName.trim(),
        mobile: empMobile.trim(),
        email: empEmail.trim(),
        address: empAddress.trim(),
        departmentId: empDepartmentId,
        departmentName: departments.find((d) => d.id === empDepartmentId)?.name || 'Front Office',
        designation: empDesignation.trim(),
        salary: Number(empSalary),
        role: empRole,
        shift: empShift,
        status: empStatus,
        joiningDate: editingEmployee?.joiningDate || new Date().toISOString().split('T')[0],
      };

      if (editingEmployee) {
        await api.put(`/v1/employees/${editingEmployee.id}`, payload);
      } else {
        await api.post('/v1/employees', payload);
      }

      if (empEmail.trim()) {
        const cleanEmail = empEmail.trim().toLowerCase();
        const role = empRole.toLowerCase();
        const assignedRole: 'admin' | 'manager' | 'front_office' =
          role.includes('admin') || role.includes('owner')
            ? 'admin'
            : role.includes('manager')
              ? 'manager'
              : 'front_office';

        saveCustomAuthUser(
          {
            sub: editingEmployee?.id || `usr-${Date.now()}`,
            email: cleanEmail,
            name: empName.trim(),
            employeeId: empId || `EMP-${Date.now().toString().slice(-4)}`,
            roleTitle: empRole,
            department: departments.find((d) => d.id === empDepartmentId)?.name || 'Front Office',
            roles: [
              assignedRole,
              ...(assignedRole === 'admin' ? ['general_manager', 'front_desk'] : assignedRole === 'manager' ? ['front_desk'] : []),
            ],
          },
          'SparkHotel@2026'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast('success', `Employee ${empName} saved successfully!`);
      setCredVersion((v) => v + 1);
      setEmployeeModalOpen(false);
      resetEmployeeForm();
    },
  });

  // Delete Employee Mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/v1/employees/${id}`, { params: { propertyId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast('success', 'Employee deleted successfully.');
      setCredVersion((v) => v + 1);
    },
  });

  // Save Department Mutation
  const saveDepartmentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        propertyId,
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase() || (deptName ? deptName.slice(0, 4).toUpperCase() : 'DEPT'),
        description: deptDesc.trim(),
        managerName: deptManager.trim(),
      };
      await api.post('/v1/departments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDepartmentModalOpen(false);
      resetDepartmentForm();
    },
  });

  const resetEmployeeForm = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpId('');
    setEmpMobile('');
    setEmpEmail('');
    setEmpAddress('');
    setEmpDesignation('');
    setEmpSalary(35000);
    setEmpRole(ROLES_LIST[2]);
    setEmpShift('morning');
    setEmpStatus('active');
  };

  const resetDepartmentForm = () => {
    setDeptName('');
    setDeptCode('');
    setDeptDesc('');
    setDeptManager('');
  };

  const startEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpId(emp.employeeId);
    setEmpMobile(emp.mobile);
    setEmpEmail(emp.email);
    setEmpAddress(emp.address || '');
    setEmpDepartmentId(emp.departmentId || '');
    setEmpDesignation(emp.designation);
    setEmpSalary(emp.salary);
    setEmpRole(emp.role);
    setEmpShift(emp.shift || 'morning');
    setEmpStatus(emp.status === 'inactive' ? 'inactive' : 'active');
    setEmployeeModalOpen(true);
  };

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.departmentName && e.departmentName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesShift = selectedShiftFilter === 'all' || (e.shift || 'general') === selectedShiftFilter;
    return matchesSearch && matchesShift;
  });

  // Shift counts
  const shiftCounts = {
    all: employees.length,
    morning: employees.filter((e) => (e.shift || 'morning') === 'morning').length,
    evening: employees.filter((e) => e.shift === 'evening').length,
    night: employees.filter((e) => e.shift === 'night').length,
    general: employees.filter((e) => e.shift === 'general').length,
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-extrabold uppercase rounded-full">
              Single Hotel HR & 3-Shift Staffing
            </span>
            <span className="text-xs text-gray-500 font-medium">Spark Hotel Karimnagar</span>
          </div>
          <h1 className="text-2xl font-bold text-telivity-navy mt-1">Staff & Three-Shift Management</h1>
          <p className="text-xs text-gray-500">
            Manage hotel staff, assignments across Morning, Evening, and Night shifts, and department managers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'attendance' ? (
            <button
              type="button"
              onClick={downloadAttendanceCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Download size={15} />
              <span>Export Attendance CSV</span>
            </button>
          ) : activeTab === 'credentials' ? (
            <button
              type="button"
              onClick={() => {
                setNewCredName('');
                setNewCredEmail('');
                setNewCredEmpId(`FO00${Math.floor(4 + Math.random() * 5)}`);
                setNewCredRole('front_office');
                setNewCredPassword('SparkHotel@2026');
                setCredModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <KeyRound size={15} />
              <span>Add Staff Credential</span>
            </button>
          ) : activeTab === 'employees' ? (
            <button
              type="button"
              onClick={() => {
                resetEmployeeForm();
                setEmployeeModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <UserPlus size={15} />
              <span>Add Employee</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                resetDepartmentForm();
                setDepartmentModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-telivity-teal hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus size={15} />
              <span>Add Department</span>
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${activeTab === 'employees'
            ? 'border-telivity-teal text-telivity-teal'
            : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
        >
          <Users size={17} />
          <span>Employees & Shifts ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('credentials')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${activeTab === 'credentials'
            ? 'border-telivity-teal text-telivity-teal'
            : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
        >
          <KeyRound size={17} />
          <span>🔐 Login Credentials & Access Control (5)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${activeTab === 'attendance'
            ? 'border-telivity-teal text-telivity-teal'
            : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
        >
          <CalendarCheck size={17} />
          <span>📅 Daily Attendance & Shifts ({attendanceRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition shrink-0 ${activeTab === 'departments'
            ? 'border-telivity-teal text-telivity-teal'
            : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
        >
          <Building2 size={17} />
          <span>Departments ({departments.length})</span>
        </button>
      </div>

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Shift Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1 flex items-center gap-1">
              <Clock size={13} className="text-telivity-teal" /> Shift:
            </span>
            <button
              type="button"
              onClick={() => setSelectedShiftFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedShiftFilter === 'all' ? 'bg-telivity-teal text-white border-telivity-teal shadow-2xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              All Staff ({shiftCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedShiftFilter('morning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedShiftFilter === 'morning' ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50'}`}
            >
              🌅 Morning Shift ({shiftCounts.morning}) <span className="text-[10px] font-normal opacity-80">06:00-14:00</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedShiftFilter('evening')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedShiftFilter === 'evening' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
            >
              🌆 Evening Shift ({shiftCounts.evening}) <span className="text-[10px] font-normal opacity-80">14:00-22:00</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedShiftFilter('night')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedShiftFilter === 'night' ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50'}`}
            >
              🌙 Night Shift ({shiftCounts.night}) <span className="text-[10px] font-normal opacity-80">22:00-06:00</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedShiftFilter('general')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedShiftFilter === 'general' ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'}`}
            >
              ☀️ General Shift ({shiftCounts.general})
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search employee by name, ID, department, or role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border-0 focus:ring-0 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Showing {filteredEmployees.length} of {employees.length} employees
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4">Assigned Shift</th>
                    <th className="py-3 px-4">Login Credentials</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Salary</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((emp) => {
                    const shiftInfo = SHIFT_DETAILS[emp.shift || 'morning'] || SHIFT_DETAILS.morning;
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{emp.name}</div>
                              <div className="text-[11px] text-gray-400 font-mono">{emp.employeeId} · {emp.designation}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-800">{emp.departmentName || 'Front Office'}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.2 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[10px] font-semibold">
                            {emp.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${shiftInfo.badge}`}>
                            <span>{shiftInfo.icon}</span>
                            <span>{shiftInfo.name}</span>
                          </span>
                          <div className="text-[10px] text-gray-500 mt-0.5 font-medium">{shiftInfo.hours}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-gray-900 text-xs font-semibold flex items-center gap-1.5">
                            <KeyRound size={13} className="text-teal-600" />
                            <span className="text-gray-400 font-mono tracking-widest">••••••••</span>
                          </div>
                          <div className="text-[11px] text-teal-700 font-medium truncate max-w-[170px]" title={emp.email}>
                            {emp.email}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Phone size={12} className="text-gray-400" />
                            <span>{emp.mobile}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                            <Mail size={12} />
                            <span>{emp.email}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-gray-900">
                          {formatMoney(emp.salary, currencyCode)}/mo
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${emp.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            {emp.status === 'active' ? (
                              <CheckCircle2 size={11} className="text-emerald-600" />
                            ) : (
                              <XCircle size={11} className="text-gray-400" />
                            )}
                            <span className="capitalize">{emp.status}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEditEmployee(emp)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-teal-700 transition"
                              title="Edit employee"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete employee record for ${emp.name}?`)) {
                                  deleteEmployeeMutation.mutate(emp.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                              title="Delete employee"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900">{dept.name}</h3>
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-mono rounded mt-1 font-bold">
                    CODE: {dept.code}
                  </span>
                </div>
                <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                  <Building2 size={18} />
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed min-h-[36px]">{dept.description}</p>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400">Head / Manager:</span>
                <span className="font-semibold text-gray-800">{dept.managerName || 'Assigned by Owner'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREDENTIALS TAB */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <div className="bg-purple-900/10 border border-purple-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-telivity-navy">
                  Role-Based Access Control & Supabase Auth Credentials
                </h2>
                <p className="text-xs text-telivity-slate">
                  Multi-Role Isolation: Super Admin (<code className="font-mono text-purple-700">/admin</code>) • Hotel Manager (<code className="font-mono text-purple-700">/manager</code>) • Front Office FO001, FO002, FO003 (<code className="font-mono text-purple-700">/front-office</code>)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                ● {allCredUsers.length} Active Accounts
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-50/70 border-b border-gray-200 text-telivity-navy uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member & Email</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Role & Assigned Dashboard</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Last Login Time</th>
                    <th className="py-3 px-4 text-right">Security Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allCredUsers.map((staff: any) => {
                    const isDeactivated = deactivatedUsers.includes(staff.email.toLowerCase());
                    const lastLogin =
                      typeof window !== 'undefined'
                        ? window.localStorage.getItem(`hotel_spark_last_login_${staff.id}`)
                        : null;

                    return (
                      <tr key={staff.email} className="hover:bg-purple-50/20 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-telivity-navy text-sm">{staff.name}</div>
                          <div className="text-[11px] text-telivity-slate font-mono">{staff.email}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                            {staff.employeeId}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${staff.role === 'admin'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : staff.role === 'manager'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : 'bg-teal-100 text-teal-900 border border-teal-200'
                                }`}
                            >
                              {staff.roleTitle}
                            </span>
                          </div>
                          <span className="text-[10px] text-telivity-mid-grey font-mono mt-0.5 block">
                            Directs to: {staff.dashboardRoute}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${!isDeactivated
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${!isDeactivated ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                            />
                            {!isDeactivated ? 'Active & Permitted' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-telivity-slate text-[11px]">
                          {lastLogin
                            ? new Date(lastLogin).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                            : 'Active (Session Live)'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCredUser(staff);
                                setNewResetPassword('SparkHotel@2026');
                                setResetModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 text-telivity-navy hover:bg-gray-100 font-semibold text-[11px] transition flex items-center gap-1"
                            >
                              <KeyRound size={12} className="text-purple-600" />
                              Reset Password
                            </button>

                            {staff.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const action = isDeactivated ? 'activate' : 'deactivate';
                                  if (
                                    window.confirm(
                                      `Are you sure you want to ${action} login access for ${staff.name} (${staff.email})?`
                                    )
                                  ) {
                                    const clean = staff.email.toLowerCase();
                                    const updated = isDeactivated
                                      ? deactivatedUsers.filter((u) => u !== clean)
                                      : [...deactivatedUsers, clean];
                                    setDeactivatedUsers(updated);
                                    if (typeof window !== 'undefined' && window.localStorage) {
                                      window.localStorage.setItem(
                                        'hotel_spark_deactivated_users',
                                        JSON.stringify(updated)
                                      );
                                    }
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${!isDeactivated
                                  ? 'bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                                  }`}
                              >
                                {!isDeactivated ? 'Deactivate' : 'Activate Account'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DAILY ATTENDANCE & SHIFTS TAB */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Total Staff</span>
                <Users size={18} className="text-telivity-teal" />
              </div>
              <div className="text-2xl font-bold text-telivity-navy">{attendanceRecords.length}</div>
              <p className="text-[11px] text-gray-400 mt-1">Across 3 daily shifts</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Present Today</span>
                <UserCheck size={18} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                {attendanceRecords.filter((r) => r.status !== 'absent').length}
              </div>
              <p className="text-[11px] text-emerald-600 mt-1">Clocked in today</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Currently On Duty</span>
                <Timer size={18} className="text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {attendanceRecords.filter((r) => r.status === 'on_duty' || r.status === 'present').length}
              </div>
              <p className="text-[11px] text-purple-600 mt-1">Active shift station</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Completed Shift</span>
                <CheckCircle2 size={18} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {attendanceRecords.filter((r) => r.status === 'completed').length}
              </div>
              <p className="text-[11px] text-blue-600 mt-1">Clocked out</p>
            </div>
          </div>

          {/* Action Header Banner */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-telivity-navy flex items-center gap-2">
                <span>Daily Staff Attendance & Working Hours Log</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-teal-50 text-telivity-teal border border-teal-200 font-mono">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time clock-in/out records, working hours tracking, and shift allocations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadAttendanceCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-telivity-teal hover:bg-teal-600 text-white font-bold text-xs shadow-xs transition"
              >
                <Download size={14} />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-teal-50/70 border-b border-gray-200 text-telivity-navy uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member & ID</th>
                    <th className="py-3 px-4">Role & Department</th>
                    <th className="py-3 px-4">Assigned Shift</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4 text-center">Hours Logged</th>
                    <th className="py-3 px-4 text-center">Attendance Status</th>
                    <th className="py-3 px-4 text-right">Duty Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {attendanceRecords.map((att) => {
                    const shiftInfo = SHIFT_DETAILS[att.shift] || SHIFT_DETAILS.morning;
                    const isOnDuty = att.status === 'on_duty' || att.status === 'present';
                    const isCompleted = att.status === 'completed';

                    return (
                      <tr key={att.id} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-telivity-navy">{att.name}</div>
                          <div className="text-[11px] font-mono text-telivity-teal">{att.employeeId}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-800">{att.role}</div>
                          <div className="text-[11px] text-gray-400">{att.department}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${shiftInfo.badge}`}>
                            {shiftInfo.name}
                          </span>
                          <span className="block text-[10px] text-gray-400 mt-0.5">{shiftInfo.hours}</span>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium">
                          {att.clockInTime}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {att.clockOutTime ? (
                            <span className="text-gray-700">{att.clockOutTime}</span>
                          ) : isOnDuty ? (
                            <span className="text-purple-600 font-bold italic animate-pulse">On Active Duty</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-bold">
                          {att.workingHours > 0 ? `${att.workingHours.toFixed(1)} hrs` : '—'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isOnDuty
                                ? 'bg-purple-100 text-purple-800'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? 'bg-purple-600 animate-ping' : isCompleted ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                            {isOnDuty ? 'On Duty' : isCompleted ? 'Shift Done' : 'Scheduled'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleAttendanceStatus(att.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                              isOnDuty
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300'
                            }`}
                          >
                            {isOnDuty ? 'Clock Out' : 'Clock In / Mark Present'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={selectedCredUser ? `Reset Password · ${selectedCredUser.name}` : 'Reset Employee Password'}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Enter a new secure password for <strong>{selectedCredUser?.name}</strong> ({selectedCredUser?.email}). The employee can immediately log in with this new password.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">New Password *</label>
            <input
              type="text"
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-purple-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newResetPassword.trim() || credActionLoading}
              onClick={handleResetPassword}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Update Password
            </button>
          </div>
        </div>
      </Modal>

      {/* ADD CREDENTIAL MODAL */}
      <Modal
        open={credModalOpen}
        onClose={() => setCredModalOpen(false)}
        title="Create New Employee Credential & Role"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Create an authenticated hotel employee account with strict role isolation.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Employee Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Suresh Kumar"
              value={newCredName}
              onChange={(e) => setNewCredName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Employee ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. FO004"
                value={newCredEmpId}
                onChange={(e) => setNewCredEmpId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role Assignment *</label>
              <select
                value={newCredRole}
                onChange={(e) => setNewCredRole(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="front_office">Front Office Executive (/front-office)</option>
                <option value="manager">Hotel Manager (/manager)</option>
                <option value="admin">Super Admin (/admin)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email *</label>
            <input
              type="email"
              required
              placeholder="e.g. fo004@sparkhotel.com"
              value={newCredEmail}
              onChange={(e) => setNewCredEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Temporary Initial Password</label>
            <input
              type="text"
              value={newCredPassword}
              onChange={(e) => setNewCredPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCredModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!newCredName.trim() || !newCredEmail.trim() || credActionLoading}
              onClick={handleCreateCredential}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              {credActionLoading ? 'Creating…' : 'Create Staff Credential'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ADD / EDIT EMPLOYEE MODAL */}
      <Modal
        open={employeeModalOpen}
        onClose={() => setEmployeeModalOpen(false)}
        title={editingEmployee ? `Edit Employee · ${editingEmployee.name}` : 'Add New Employee · Spark Hotel'}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee ID</label>
              <input
                type="text"
                placeholder="e.g. EMP-SPARK-008"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={empMobile}
                onChange={(e) => setEmpMobile(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Work Email</label>
              <input
                type="email"
                placeholder="employee@sparkhotel.com"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <select
                value={empDepartmentId}
                onChange={(e) => setEmpDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
              <input
                type="text"
                placeholder="e.g. Receptionist"
                value={empDesignation}
                onChange={(e) => setEmpDesignation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Operational Role</label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white font-semibold text-telivity-navy"
              >
                {ROLES_LIST.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Shift *</label>
              <select
                value={empShift}
                onChange={(e) => setEmpShift(e.target.value as ShiftType)}
                className="w-full rounded-lg border border-teal-400 bg-teal-50/50 px-3 py-2 text-sm font-bold text-telivity-navy"
              >
                <option value="morning">🌅 Morning Shift (06:00 AM – 02:00 PM)</option>
                <option value="evening">🌆 Evening Shift (02:00 PM – 10:00 PM)</option>
                <option value="night">🌙 Night Shift (10:00 PM – 06:00 AM)</option>
                <option value="general">☀️ General Shift (09:00 AM – 06:00 PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary (INR)</label>
              <input
                type="number"
                value={empSalary}
                onChange={(e) => setEmpSalary(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={empStatus}
                onChange={(e) => setEmpStatus(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
              <KeyRound size={13} className="text-teal-700" />
              <span>Admin Panel Login Credentials</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Username:</span>
                <p className="font-mono font-bold text-gray-800">{empEmail || `${empName.toLowerCase().replace(/\s+/g, '') || 'staff'}@sparkhotel.com`}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Initial Password:</span>
                <p className="font-mono font-bold text-gray-800">•••••••• (Standard Secure Token)</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Residential Address</label>
            <input
              type="text"
              placeholder="Address in Karimnagar"
              value={empAddress}
              onChange={(e) => setEmpAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setEmployeeModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveEmployeeMutation.mutate()}
              disabled={saveEmployeeMutation.isPending || !empName.trim()}
              className="px-5 py-2 bg-telivity-teal hover:bg-teal-600 text-white text-sm font-bold rounded-lg shadow-sm transition"
            >
              {saveEmployeeMutation.isPending ? 'Saving…' : editingEmployee ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ADD DEPARTMENT MODAL */}
      <Modal
        open={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        title="Add Department · Spark Hotel"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Concierge"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department Code</label>
              <input
                type="text"
                placeholder="e.g. CONC"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department Head / Manager</label>
              <input
                type="text"
                placeholder="Manager Name"
                value={deptManager}
                onChange={(e) => setDeptManager(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Responsibilities and operational scope"
              value={deptDesc}
              onChange={(e) => setDeptDesc(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setDepartmentModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveDepartmentMutation.mutate()}
              disabled={saveDepartmentMutation.isPending || !deptName.trim()}
              className="px-5 py-2 bg-telivity-teal hover:bg-teal-600 text-white text-sm font-bold rounded-lg shadow-sm transition"
            >
              {saveDepartmentMutation.isPending ? 'Saving…' : 'Create Department'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}