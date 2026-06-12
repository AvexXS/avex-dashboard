import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ROLES = ["user", "engineer", "staff", "admin"];

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "staff" });

  const fetchUsers = () => api.get("/admin/users").then(({ data }) => setUsers(data));
  useEffect(() => { fetchUsers(); }, []);

  const createStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/users/staff", form);
      toast.success("Staff created.");
      setOpen(false);
      setForm({ email: "", name: "", password: "", role: "staff" });
      fetchUsers();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not create staff.");
    }
  };

  const setRole = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      toast.success("Role updated.");
      fetchUsers();
    } catch { toast.error("Could not update role."); }
  };

  const remove = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("User deleted.");
      fetchUsers();
    } catch { toast.error("Could not delete user."); }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ Admin / Users</div>
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-tighter mt-3">Users &amp; staff</h1>
        </div>
        {isAdmin && (
          <button onClick={() => setOpen(true)} data-testid="admin-create-staff-btn" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider font-medium hover:bg-white/90 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add staff
          </button>
        )}
      </div>

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-white/40 border-b border-white/10">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Verified</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5" data-testid={`user-row-${u.id}`}>
                <td className="px-6 py-4">{u.name}</td>
                <td className="px-6 py-4 text-sm font-mono">{u.email}</td>
                <td className="px-6 py-4">
                  {isAdmin && u.id !== currentUser?.id ? (
                    <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} data-testid={`user-role-${u.id}`} className="bg-transparent border border-white/15 px-2 py-1 text-xs uppercase tracking-wider">
                      {ROLES.map((r) => (<option key={r} value={r} className="bg-black">{r}</option>))}
                    </select>
                  ) : (
                    <span className="text-xs uppercase tracking-wider">{u.role}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs uppercase tracking-wider text-white/60">{u.email_verified ? "Yes" : "No"}</td>
                <td className="px-6 py-4 text-xs font-mono text-white/40">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  {isAdmin && u.id !== currentUser?.id && (
                    <button onClick={() => remove(u.id)} className="text-white/40 hover:text-white p-1" data-testid={`user-delete-${u.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={createStaff} className="w-full max-w-md border border-white/15 bg-black p-8">
            <div className="text-xs uppercase tracking-[0.3em] text-white/40">/ New staff</div>
            <h2 className="font-display text-3xl mt-2 tracking-tight">Add a team member</h2>
            <div className="mt-8 space-y-6">
              <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} testid="staff-name" />
              <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} testid="staff-email" />
              <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} testid="staff-password" />
              <div>
                <label className="text-xs uppercase tracking-widest text-white/40">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="staff-role" className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none">
                  <option value="staff" className="bg-black">Staff</option>
                  <option value="engineer" className="bg-black">Engineer</option>
                  <option value="admin" className="bg-black">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-5 py-3 text-sm uppercase tracking-wider border border-white/20 hover:bg-white/5">Cancel</button>
              <button type="submit" data-testid="staff-create-submit" className="bg-white text-black px-6 py-3 text-sm uppercase tracking-wider hover:bg-white/90">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", testid }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-white/40">{label}</label>
      <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-white py-3 outline-none" />
    </div>
  );
}
