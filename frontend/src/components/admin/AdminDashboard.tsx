import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getDashboardStats, getAdminUsers, getAdminPrayers, getAdminReports, deleteUser, toggleBlockUser, getAdminConnections, getAdminPayments, getAnalyticsData, AnalyticsData, adminCreateUser } from '../../services/adminService';
import { LayoutDashboard, Users, Shield, Activity, LogOut, MessageSquare, Heart, Trash2, Search, CheckCircle, XCircle, Link as LinkIcon, CreditCard, DollarSign, Calendar, MoreHorizontal, ChevronDown, RefreshCw, ClipboardList, Settings, Menu } from 'lucide-react';
import { EditProfileView } from '../../MainApp';
import { updateUserDocument } from '../../services/userService';
import AdminAccessControl from './AdminAccessControl';

import { getCurrentAdminAccess } from '../../services/adminRbacService';
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    people: true,
    operations: true,
    billing: false,
    system: true,
  });
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    void getCurrentAdminAccess().then((access) => {
      setPermissions(new Set(access.permissions));
    }).catch((error) => console.error('Unable to load admin permissions:', error));
  }, []);

  const can = (permission: string) => permissions.has(permission) || permissions.has('permissions.manage');
  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'users':
        return <UsersView />;
      case 'connections':
        return <ConnectionsView />;
      case 'payments':
        return <PaymentsView />;
      case 'prayers':
        return <PrayersView />;
      case 'moderation':
        return <ModerationView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'access-control':
        return <AdminAccessControl initialTab="groups" />;
      case 'audit-logs':
        return <AdminAccessControl initialTab="audit" />;
      default:
        return <Overview />;
    }
  };

  const groupActive = (group: string) => {
    if (group === 'people') return ['users', 'connections', 'prayers'].includes(activeTab);
    if (group === 'operations') return ['moderation', 'analytics'].includes(activeTab);
    if (group === 'billing') return activeTab === 'payments';
    return ['access-control', 'audit-logs'].includes(activeTab);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] font-sans text-slate-900">
      {/* Mobile-first CMG Admin header, based on the Onboard Admin pattern. */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => selectTab('overview')} className="text-left">
            <div className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              <span>CMG</span><span className="text-brand-orange"> Admin</span>
            </div>
            <div className="text-xs font-bold text-slate-500 sm:text-sm">Christian Match Ghana</div>
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" title="Refresh" aria-label="Refresh" onClick={() => window.location.reload()} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100">
              <RefreshCw size={21} />
            </button>
            <button type="button" title="Notifications" aria-label="Notifications" onClick={() => selectTab('prayers')} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100">
              <MessageSquare size={21} />
            </button>
            <button type="button" title="Sign out" aria-label="Sign out" onClick={handleSignOut} className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100">
              <LogOut size={21} />
            </button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">A</span>
          </div>
        </div>

        <div className="bg-slate-900 px-3 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
            {[
              ['people', 'People', <Users size={16} />],
              ['operations', 'Operations', <Activity size={16} />],
              ['billing', 'Billing', <CreditCard size={16} />],
              ['system', 'System', <Settings size={16} />],
            ].map(([key, label, icon]) => (
              <button key={String(key)} type="button" onClick={() => selectTab(key === 'people' ? 'users' : key === 'operations' ? 'moderation' : key === 'billing' ? 'payments' : 'access-control')} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition sm:flex-none ${groupActive(String(key)) ? 'border-white/80 bg-white/30 text-white' : 'border-white/50 bg-white/20 text-white/90 hover:bg-white/30'}`}>
                {icon}{label}
              </button>
            ))}
          </div>
          <div className="mx-auto mt-2 flex max-w-6xl flex-wrap justify-center gap-2">
            {[
              ['overview', 'CMG Admin', <LayoutDashboard size={16} />],
              ['moderation', 'Reports', <ClipboardList size={16} />],
              ['audit-logs', 'Audit', <Shield size={16} />],
            ].map(([key, label, icon]) => (
              <button key={String(key)} type="button" onClick={() => selectTab(String(key))} className={`flex min-h-9 items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-sm font-black transition ${activeTab === key ? 'border-white/80 bg-white/30 text-white' : 'border-white/50 bg-white/20 text-white/90 hover:bg-white/30'}`}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl overflow-auto px-4 py-5 sm:px-6 sm:py-8">
        {renderContent()}
      </main>
    </div>
  );
};

// --- Sub-Views ---

const Overview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMatches: 0,
    totalRevenue: 0,
    pendingReports: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      const data = await getDashboardStats();
      setStats(data);
    };
    loadStats();
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} change="+0%" icon={<Users className="text-blue-500" />} />
        <StatCard title="Active Matches" value={stats.activeMatches.toLocaleString()} change="+0%" icon={<LinkIcon className="text-indigo-500" />} />
        <StatCard title="Revenue (Mo)" value={`$${stats.totalRevenue.toLocaleString()}`} change="+0%" icon={<DollarSign className="text-green-500" />} />
        <StatCard title="Pending Reports" value={stats.pendingReports.toLocaleString()} change="0" isNegative icon={<Shield className="text-red-500" />} />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Activity Overview</h3>
        <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          Chart Visualization Placeholder
        </div>
      </div>
    </>
  );
};

const UsersView = () => {
    // Real Data
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            const data = await getAdminUsers();
            // Map Firestore data to UI format if needed
            const formattedUsers = data.map(user => ({
                ...user,
                id: user.id,
                name: user.name || 'Unknown',
                email: user.email || 'No Email',
                phone: user.phone || 'N/A',
                role: user.isPremium ? 'Subscriber' : 'User',
                status: user.isBlocked ? 'Blocked' : 'Active', // Updated to use isBlocked flag
                joined: user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                verified: user.isVerified,
                location: user.location || user.country || 'N/A',
                bio: user.bio || '',
                denomination: user.denomination || 'N/A',
                profileCompletion: 50 // Placeholder logic for completion
            }));
            setUsers(formattedUsers);
            setLoading(false);
        };
        fetchUsers();
    }, []);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null); // State for the details modal
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filter & Add User State
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Blocked'>('All');
    const [filterRole, setFilterRole] = useState<'All' | 'User' | 'Subscriber'>('All');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'User', phone: '', status: 'Active' });

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleBlock = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const user = users.find(u => u.id === id);
        if (!user) return;

        const newStatus = user.status === 'Blocked' ? 'Active' : 'Blocked';
        const isBlocked = newStatus === 'Blocked';

        // Optimistic update
        setUsers(users.map(u => {
            if (u.id === id) {
                return { ...u, status: newStatus };
            }
            return u;
        }));
        setOpenMenuId(null);

        const success = await toggleBlockUser(id, isBlocked);
        if (!success) {
            // Revert if failed
            alert("Failed to update user status");
             setUsers(users.map(u => {
                if (u.id === id) {
                    return { ...u, status: user.status };
                }
                return u;
            }));
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
             // Optimistic update
            const prevUsers = [...users];
            setUsers(users.filter(user => user.id !== id));
            if (selectedUser?.id === id) setSelectedUser(null);
            setOpenMenuId(null);

            const success = await deleteUser(id);
             if (!success) {
                alert("Failed to delete user");
                setUsers(prevUsers);
            }
        }
    };

    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            alert("Name, Email, and Password are required!");
            return;
        }
        if (newUser.password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        setIsSavingUser(true);
        const result = await adminCreateUser(newUser);
        setIsSavingUser(false);

        if (result.success) {
            const userToAdd = {
                id: result.userId || String(Date.now()),
                ...newUser,
                joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                verified: false,
                location: "N/A",
                bio: "New user.",
                denomination: "N/A",
                profileCompletion: 0
            };
            // @ts-ignore
            setUsers([userToAdd, ...users]); // Add to the top
            setIsAddUserModalOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'User', phone: '', status: 'Active' });
            alert("User created successfully! A verification email has been sent.");
        } else {
            alert(`Error: ${result.message}`);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || user.status === filterStatus;
        const matchesRole = filterRole === 'All' || user.role === filterRole;
        return matchesSearch && matchesStatus && matchesRole;
    });

    const handleExport = () => {
        const headers = ["Name", "Email", "Phone", "Role", "Status", "Joined", "Location", "Bio", "Denomination"];
        const csvContent = [
            headers.join(","),
            ...filteredUsers.map((u: any) => [
                `"${(u.name || '').replace(/"/g, '""')}"`,
                `"${(u.email || '').replace(/"/g, '""')}"`,
                `"${(u.phone || '').replace(/"/g, '""')}"`,
                `"${u.role}"`,
                `"${u.status}"`,
                `"${u.joined}"`,
                `"${(u.location || '').replace(/"/g, '""')}"`,
                `"${(u.bio || '').replace(/"/g, '""')}"`,
                `"${(u.denomination || '').replace(/"/g, '""')}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "users_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                    />
                </div>
                <div className="flex gap-2 relative">
                    <button 
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 ${showFilterMenu ? 'bg-gray-50 ring-2 ring-brand-orange/20' : ''}`}
                    >
                        Filter
                    </button>
                    {showFilterMenu && (
                        <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Filter Users</h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        {['All', 'Active', 'Blocked'].map(status => (
                                            <button 
                                                key={status}
                                                onClick={() => setFilterStatus(status as any)}
                                                className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${filterStatus === status ? 'bg-white shadow-sm text-brand-orange' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Role</label>
                                    <select 
                                        value={filterRole}
                                        onChange={(e) => setFilterRole(e.target.value as any)}
                                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-brand-orange"
                                    >
                                        <option value="All">All Roles</option>
                                        <option value="User">User</option>
                                        <option value="Subscriber">Subscriber</option>
                                    </select>
                                </div>

                                <button 
                                    onClick={() => {
                                        setFilterStatus('All');
                                        setFilterRole('All');
                                    }}
                                    className="w-full py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="px-4 py-2 bg-brand-orange text-white rounded-lg text-sm hover:bg-brand-orange/90 shadow-sm shadow-brand-orange/20"
                    >
                        Add User
                    </button>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 shadow-sm flex items-center gap-2"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">User</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Telephone</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Role</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Joined</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map((user) => (
                            <tr 
                                key={user.id} 
                                onClick={() => setSelectedUser(user)}
                                className="hover:bg-gray-50 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 flex items-center gap-1">
                                                {user.name}
                                                {user.verified && <CheckCircle size={14} className="text-blue-500" fill="currentColor" color="white" />}
                                            </div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{user.phone || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{user.role}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{user.joined}</td>
                                <td className="px-6 py-4 text-right relative">
                                    <button 
                                        onClick={(e) => toggleMenu(e, user.id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>
                                    
                                    {openMenuId === user.id && (
                                        <div className="absolute right-8 top-10 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <button 
                                                onClick={(e) => handleBlock(e, user.id)}
                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <Shield size={16} />
                                                {user.status === 'Blocked' ? 'Unblock User' : 'Block User'}
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, user.id)}
                                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <Trash2 size={16} />
                                                Delete User
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            

             {/* Filter Menu Overlay */}
            {showFilterMenu && (
                <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowFilterMenu(false)}
                />
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Add New User</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="e.g. john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input 
                                    type="password" 
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="Min 6 characters"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                                <input 
                                    type="tel" 
                                    value={newUser.phone}
                                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                                    placeholder="+233..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select 
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white"
                                    >
                                        <option value="User">User</option>
                                        <option value="Subscriber">Subscriber</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select 
                                        value={newUser.status}
                                        onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Blocked">Blocked</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setIsAddUserModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddUser}
                                disabled={isSavingUser}
                                className="flex-1 px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange/90 font-medium shadow-lg shadow-brand-orange/20 disabled:opacity-50"
                            >
                                {isSavingUser ? 'Saving...' : 'Save User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay to close menu when clicking outside */}
            {openMenuId !== null && (
                <div 
                    className="fixed inset-0 z-0 bg-transparent" 
                    onClick={() => setOpenMenuId(null)}
                />
            )}

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="relative bg-slate-900 h-32">
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="px-8 pb-8">
                            <div className="relative -mt-12 mb-6 flex justify-between items-end">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500 shadow-md">
                                    {selectedUser.name.charAt(0)}
                                </div>
                                <div className="flex gap-3 mb-1">
                                    <button 
                                        onClick={() => window.location.href = `mailto:${selectedUser.email}?from=christianmatchghanaltd@gmail.com`}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 shadow-sm"
                                    >
                                        Message
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingProfile(true)}
                                        className="px-4 py-2 bg-brand-orange text-white font-medium rounded-lg text-sm hover:bg-brand-orange/90 shadow-sm shadow-brand-orange/20"
                                    >
                                        Edit Profile
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                                {selectedUser.verified && <CheckCircle size={20} className="text-blue-500" fill="currentColor" color="white" />}
                            </div>
                            <p className="text-sm text-gray-500 mb-6">{selectedUser.location} • Joined {selectedUser.joined}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Account Info</h3>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                        <span className="text-gray-500">Email:</span>
                                        <span className="text-gray-900 font-medium">{selectedUser.email}</span>
                                        
                                        <span className="text-gray-500">Phone:</span>
                                        <span className="text-gray-900 font-medium">{selectedUser.phone}</span>
                                        
                                        <span className="text-gray-500">Role:</span>
                                        <span className="text-gray-900 font-medium">{selectedUser.role}</span>
                                        
                                        <span className="text-gray-500">Status:</span>
                                        <span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                selectedUser.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {selectedUser.status}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Profile Details</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Bio</span>
                                            <p className="text-sm text-gray-700 mt-1 leading-relaxed bg-gray-50 p-2 rounded-lg">
                                                "{selectedUser.bio}"
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                            <span className="text-gray-500">Denomination:</span>
                                            <span className="text-gray-900 font-medium">{selectedUser.denomination}</span>
                                            
                                            <span className="text-gray-500">Completion:</span>
                                            <span className="text-gray-900 font-medium">{selectedUser.profileCompletion}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Profile Overlay */}
            {isEditingProfile && selectedUser && (
                <div className="fixed inset-0 z-[200] bg-white overflow-hidden flex flex-col">
                    <EditProfileView
                        user={selectedUser}
                        onCancel={() => setIsEditingProfile(false)}
                        onNotify={(msg) => alert(msg)}
                        onSave={async (updatedUser) => {
                            try {
                                await updateUserDocument(selectedUser.id, updatedUser);
                                
                                // Update local state so UI reflects immediately
                                const updatedSelectedUser = { ...selectedUser, ...updatedUser };
                                setSelectedUser(updatedSelectedUser);
                                
                                setUsers(users.map(u => u.id === selectedUser.id ? updatedSelectedUser : u));
                                setIsEditingProfile(false);
                                alert("User profile updated successfully");
                            } catch (e) {
                                console.error(e);
                                alert("Failed to save changes");
                            }
                        }}
                    />
                </div>
            )}
            
        </div>
    );
};

const PrayersView = () => {
    // Real Data
    const [prayers, setPrayers] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchPrayers = async () => {
             const data = await getAdminPrayers();
             const formattedPrayers = data.map(p => ({
                 id: p.id,
                 user: p.userName || 'Anonymous',
                 content: p.content,
                 likes: p.prayingCount || 0,
                 comments: p.commentCount || 0,
                 date: p.date, // Formatted in service
                 reported: p.reported || false
             }));
             setPrayers(formattedPrayers);
        };
        fetchPrayers();
    }, []);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Reported'>('All');

    const filteredPrayers = prayers.filter(p => {
        const matchesSearch = p.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || 
                              (filterStatus === 'Reported' ? p.reported : !p.reported);
        return matchesSearch && matchesStatus;
    });

    const handleExport = () => {
        const headers = ["User", "Content", "Likes", "Comments", "Date", "Status"];
        const csvContent = [
            headers.join(","),
            ...filteredPrayers.map(p => [
                `"${p.user}"`,
                `"${p.content.replace(/"/g, '""')}"`,
                p.likes,
                p.comments,
                `"${p.date}"`,
                p.reported ? "Reported" : "Active"
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "prayer_requests.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search prayers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                    />
                </div>
                <div className="flex gap-2 relative">
                    <button 
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2 ${showFilterMenu ? 'bg-gray-50 ring-2 ring-brand-orange/20' : ''}`}
                    >
                        Filter
                    </button>
                    {showFilterMenu && (
                        <div className="absolute top-12 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
                            <h4 className="font-semibold text-gray-900 mb-3 text-sm">Filter Requests</h4>
                            <div className="space-y-2">
                                {['All', 'Active', 'Reported'].map(status => (
                                    <button 
                                        key={status}
                                        onClick={() => {
                                            setFilterStatus(status as any);
                                            setShowFilterMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                                            filterStatus === status 
                                            ? 'bg-brand-orange/10 text-brand-orange font-medium' 
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-brand-orange text-white rounded-lg text-sm hover:bg-brand-orange/90 flex items-center gap-2 shadow-sm shadow-brand-orange/20"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">User</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Content</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Engagement</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredPrayers.map((prayer) => (
                            <tr key={prayer.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{prayer.user}</div>
                                    <div className="text-xs text-gray-400">{prayer.date}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-gray-600 text-sm line-clamp-2 max-w-sm">{prayer.content}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1"><Heart size={14} /> {prayer.likes}</span>
                                        <span className="flex items-center gap-1"><MessageSquare size={14} /> {prayer.comments}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {prayer.reported ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Reported
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Filter Menu Overlay */}
            {showFilterMenu && (
                <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowFilterMenu(false)}
                />
            )}
        </div>
    );
};

const ConnectionsView = () => {
    // Real Data
    const [connections, setConnections] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchConnections = async () => {
             const data = await getAdminConnections();
             setConnections(data);
        };
        fetchConnections();
    }, []);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredConnections = connections.filter(conn => 
        conn.userA.toLowerCase().includes(searchTerm.toLowerCase()) || 
        conn.userB.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Active Connections</h3>
                <div className="flex gap-2">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search users..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Initiator</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Recipient</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Connected On</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Last Message</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredConnections.map((conn) => (
                            <tr key={conn.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{conn.userA}</td>
                                <td className="px-6 py-4 font-medium text-gray-900">{conn.userB}</td>
                                <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        conn.status === 'Matched' ? 'bg-green-100 text-green-800' :
                                        conn.status === 'Blocked' ? 'bg-red-100 text-red-800' : 
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {conn.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{conn.date}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]" title={conn.lastMessage}>{conn.lastMessage}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PaymentsView = () => {
    // Real Data
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayments = async () => {
            const data = await getAdminPayments();
            const formatted = data.map(t => ({
                id: t.reference || t.id.slice(0, 8),
                user: t.userName || 'Anonymous',
                amount: t.amount,
                type: t.type === 'connection_fee' ? 'Connection Fee' : 'Premium',
                date: t.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently',
                status: t.status === 'success' ? 'Success' : 'Failed'
            }));
            setTransactions(formatted);
            setLoading(false);
        };
        fetchPayments();
    }, []);

    const totalRevenue = transactions.reduce((sum, t) => t.status === 'Success' ? sum + t.amount : sum, 0);
    const successCount = transactions.filter(t => t.status === 'Success').length;
    const failedCount = transactions.filter(t => t.status === 'Failed').length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-900">₵{totalRevenue.toFixed(2)}</h3>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Successful Transactions</p>
                    <h3 className="text-2xl font-bold text-green-600">{successCount}</h3>
                </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">Failed Transactions</p>
                    <h3 className="text-2xl font-bold text-red-600">{failedCount}</h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Recent Transactions</h3>
                    <button className="text-brand-orange text-sm font-semibold hover:underline">View All</button>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading transactions...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                             <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Ref ID</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">User</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Service</th>
                                 <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                                        No transactions yet.
                                    </td>
                                </tr>
                            ) : transactions.map((trx) => (
                                <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm text-gray-500">{trx.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{trx.user}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{trx.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{trx.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">₵{trx.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            trx.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {trx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const ModerationView = () => {
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        const fetchReports = async () => {
            const data = await getAdminReports();
            const formattedReports = data.map(r => ({
                id: r.id,
                reporter: r.reporterName || 'System',
                reportedUser: r.reportedUserName || 'Unknown',
                type: r.reason || 'General',
                content: r.description || 'No details',
                date: r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                status: r.status || 'pending'
            }));
             setReports(formattedReports);
        };
        fetchReports();
    }, []);

    const handleResolve = (id: string) => {
        // Optimistic update
        setReports(reports.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
        // TODO: Call service to update in DB
    };

    const handleDismiss = (id: string) => {
         if (window.confirm("Dismiss this report?")) {
            setReports(reports.filter(r => r.id !== id));
            // TODO: Call service to delete/archive in DB
        }
    };

    const handleBanUser = (id: string, user: string) => {
        if (window.confirm(`Are you sure you want to BAN user ${user}?`)) {
             setReports(reports.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
             alert(`User ${user} has been banned.`);
             // TODO: Call service to block user in DB
        }
    };

    const filteredReports = reports.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        Pending
                    </button>
                     <button 
                        onClick={() => setFilter('resolved')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        Resolved
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Reported User</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Reason</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Details</th>
                             <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Date</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredReports.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{report.reportedUser}</div>
                                    <div className="text-xs text-gray-500">Rep by: {report.reporter}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md text-xs font-medium border border-red-100">{report.type}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={report.content}>{report.content}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{report.date}</td>
                                <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        report.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {report.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {report.status === 'pending' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleResolve(report.id)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                                                title="Resolve (Keep Content)"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDismiss(report.id)}
                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" 
                                                title="Dismiss Report"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleBanUser(report.id, report.reportedUser)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                                                title="Ban User"
                                            >
                                                <Shield size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                         {filteredReports.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <CheckCircle size={48} className="text-gray-200 mb-4" />
                                        <p>No reports found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};




const AnalyticsView = () => {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const result = await getAnalyticsData(timeRange);
                setData(result);
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [timeRange]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 h-96">
                <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Crunching the numbers...</p>
            </div>
        );
    }

    if (!data) return <div className="p-10 text-center text-gray-500">Failed to load analytics data.</div>;

    const currentData = data;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Controls */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Platform Analytics</h3>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['7d', '30d', '90d'].map((range) => (
                        <button 
                            key={range}
                            onClick={() => setTimeRange(range as any)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                timeRange === range 
                                ? 'bg-white text-brand-orange shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {range === '7d' ? 'Week' : range === '30d' ? 'Month' : 'Quarter'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {currentData.cards.map((card, idx) => (
                    <AnalyticsCard 
                        key={idx}
                        title={card.title} 
                        value={card.value} 
                        change={card.change} 
                        trend={card.trend as 'up' | 'down'} 
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Chart 1: User Growth */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-semibold text-gray-800">User Growth Trend</h4>
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">{currentData.cards[0].change} vs prev</span>
                    </div>
                    {/* CSS Bar Chart */}
                    <div className="flex items-end justify-between h-48 gap-3">
                        {currentData.growth.map((item, idx) => {
                            // Calculate max value for scaling (with some padding)
                            const maxVal = Math.max(...currentData.growth.map(d => d.value), 1);
                            const heightPct = (item.value / maxVal) * 100;
                            
                            return (
                                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div className="relative w-full bg-gray-100 rounded-t-lg h-full flex items-end overflow-hidden">
                                         <div 
                                            className="w-full bg-brand-orange/80 group-hover:bg-brand-orange transition-all duration-500 rounded-t-lg"
                                            style={{ height: `${heightPct}%` }} 
                                         />
                                         {/* Tooltip */}
                                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                            {item.value} users
                                         </div>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Visual Chart 2: Demographics */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                     <h4 className="font-semibold text-gray-800 mb-6">Demographics</h4>
                     
                     <div className="space-y-8">
                        {/* Gender Split */}
                        <div>
                            <div className="flex justify-between text-sm mb-2 text-gray-600">
                                <span>Gender Distribution</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                {currentData.demographics.gender.map((item) => (
                                    <div 
                                        key={item.label}
                                        className={`${item.color} h-full relative group transition-all duration-500`}
                                        style={{ width: `${Math.max(item.value, 5)}%` }} // Minimum visible width
                                        title={`${item.label}: ${item.value}%`}
                                    >
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 mt-2 justify-center">
                                {currentData.demographics.gender.map(item => (
                                    <div key={item.label} className="flex items-center gap-2 text-xs text-gray-500">
                                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                        {item.label} ({item.value}%)
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Age Distribution */}
                         <div>
                            <div className="flex justify-between text-sm mb-3 text-gray-600">
                                <span>Age Groups</span>
                            </div>
                            <div className="space-y-3">
                                {currentData.demographics.age.map((item) => (
                                    <div key={item.label}>
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>{item.label}</span>
                                            <span>{item.value}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-slate-600 rounded-full transition-all duration-500"
                                                style={{ width: `${item.value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Top Locations */}
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-4">Top Locations</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {currentData.locations.length === 0 ? (
                        <div className="col-span-3 text-center text-gray-500 py-4">No location data yet.</div>
                    ) : (
                        currentData.locations.map((loc, idx) => (
                            <div key={loc.city} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold">
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{loc.city}</p>
                                    <p className="text-sm text-gray-500">{loc.users.toLocaleString()} users</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const AnalyticsCard = ({ title, value, change, trend }: { title: string, value: string, change: string, trend: 'up' | 'down' }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className="flex items-end gap-3 mt-1">
            <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded mb-1 ${
                trend === 'up' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
                {change}
            </span>
        </div>
    </div>
);

// --- Components ---

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
    active 
      ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
  }`}>
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, change, isNegative, icon }: { title: string, value: string, change: string, isNegative?: boolean, icon?: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-hover hover:shadow-md relative overflow-hidden">
    <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
            {icon || <Activity size={20} className="text-gray-400" />}
        </div>
        <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            isNegative 
            ? 'bg-red-50 text-red-600' 
            : 'bg-green-50 text-green-600'
        }`}>
            {change}
        </span>
    </div>
    <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
    <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
  </div>
);

export default AdminDashboard;
