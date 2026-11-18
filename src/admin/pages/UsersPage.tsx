import { useMemo, useState } from 'react';
import { Info, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { useAdminUsersQuery } from '../lib/queries';
import { getApiErrorMessage } from '../lib/api-error';
import type { UserResponse } from '../types';

export default function UsersPage(){
  const usersQuery=useAdminUsersQuery();const [roleFilter,setRoleFilter]=useState('');const users=usersQuery.data??[];
  const filtered=useMemo(()=>roleFilter?(usersQuery.data??[]).filter(user=>user.role===roleFilter):usersQuery.data??[],[usersQuery.data,roleFilter]);
  const columns:Column<UserResponse>[]=[
    {id:'name',header:'Name',accessor:user=>user.name},
    {id:'email',header:'Email',accessor:user=>user.email},
    {id:'phoneNumber',header:'Phone',accessor:user=>user.phoneNumber??'—'},
    {id:'role',header:'Role',accessor:user=>user.role,render:user=>user.role==='STAFF'?<StatusBadge tone="info">Staff</StatusBadge>:<Badge variant={user.role==='ADMIN'?'default':'secondary'}>{user.role==='ADMIN'?'Admin':'User'}</Badge>},
  ];
  return <><PageHeader title="Users" subtitle="View registered accounts and their access roles."/>
    <div role="note" className="mb-4 flex items-start gap-3 rounded-lg border border-subtle bg-page-muted p-4 text-sm text-text-secondary"><Info className="mt-0.5 size-4 shrink-0 text-text-muted"/><p>Users sign in by email OTP. Make someone an admin by changing their role in the database.</p></div>
    <DataTable rows={filtered} columns={columns} rowKey={user=>user.id} loading={usersQuery.isLoading} error={usersQuery.error?getApiErrorMessage(usersQuery.error):undefined} onRetry={()=>void usersQuery.refetch()} searchColumns={columns} emptyTitle="No users yet" emptyIcon={<Users className="size-9 text-text-muted"/>}
      filterSlot={<label className="flex items-center gap-2 text-sm text-text-secondary"><span>Role</span><select aria-label="Filter users by role" className="h-10 min-w-32 rounded-md border border-subtle bg-surface px-3 text-sm text-text-primary" value={roleFilter} onChange={event=>setRoleFilter(event.target.value)}><option value="">All roles</option><option value="ADMIN">Admin</option><option value="STAFF">Staff</option><option value="USER">User</option></select></label>}/>
  </>;
}
