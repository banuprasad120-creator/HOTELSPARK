import { useState } from 'react';
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
} from 'lucide-react';
import { api } from '../lib/api';
import { useProperty } from '../context/PropertyContext';
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

export default function StaffManagement() {
  const { propertyId, currencyCode } = useProperty();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'employees' | 'departments'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'all' | ShiftType>('all');

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
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
    },
  });

  // Save Department Mutation
  const saveDepartmentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        propertyId,
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase() || deptName.slice(0, 4).toUpperCase(),
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
          {activeTab === 'employees' ? (
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
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'employees'
              ? 'border-telivity-teal text-telivity-teal'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users size={17} />
          <span>Employees & Shifts ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'departments'
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
                            <span>SparkHotel@2026</span>
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
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              emp.status === 'active'
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
                <span className="text-gray-500 font-medium">Default Password:</span>
                <p className="font-mono font-bold text-gray-800">SparkHotel@2026</p>
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