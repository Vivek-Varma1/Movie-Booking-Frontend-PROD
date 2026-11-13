import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
const auth = vi.hoisted(() => ({status:'loading',user:null as {id:number;email:string;role:'USER'|'ADMIN'}|null,openAuthModal:vi.fn()}));
const router = vi.hoisted(() => ({navigate:vi.fn(),invalidate:vi.fn()}));
vi.mock('@/components/auth/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('@tanstack/react-router',()=>({useRouter:()=>router}));
import { RequireAdmin } from '@/admin/components/RequireAdmin';
import { isAdmin } from '@/admin/lib/auth';
import { DataTable, tablePage, type Column } from '@/admin/components/DataTable';
import { getApiErrorMessage } from '@/admin/lib/api-error';
import { validateImage } from '@/admin/components/ImageUpload';
import { seatCategoryOptions } from '@/admin/types';
afterEach(()=>{cleanup();vi.clearAllMocks();auth.status='loading';auth.user=null;});
describe('admin access',()=>{
 it('never redirects or opens login while loading',()=>{render(<RequireAdmin>Private</RequireAdmin>);expect(screen.queryByText('Private')).toBeNull();expect(router.navigate).not.toHaveBeenCalled();expect(auth.openAuthModal).not.toHaveBeenCalled();});
 it('prompts anonymous visitors with a retry continuation',()=>{auth.status='anonymous';render(<RequireAdmin>Private</RequireAdmin>);expect(auth.openAuthModal).toHaveBeenCalledWith({onSuccess:expect.any(Function)});expect(screen.queryByText('Private')).toBeNull();});
 it('denies USER role and replaces history with home',()=>{auth.status='authenticated';auth.user={id:1,email:'test@example.com',role:'USER'};render(<RequireAdmin>Private</RequireAdmin>);expect(router.navigate).toHaveBeenCalledWith({to:'/',replace:true});expect(screen.queryByText('Private')).toBeNull();});
 it('renders only for ADMIN',()=>{auth.status='authenticated';auth.user={id:1,email:'test@example.com',role:'ADMIN'};render(<RequireAdmin>Private</RequireAdmin>);expect(screen.getByText('Private')).toBeInTheDocument();expect(isAdmin({...auth.user,role:'USER'})).toBe(false);expect(isAdmin(null)).toBe(false);});
});
describe('admin foundation rules',()=>{
 const rows=Array.from({length:21},(_,id)=>({id,name:`Record ${id}`}));const columns:Column<typeof rows[number]>[]=[{id:'id',header:'ID',accessor:r=>r.id},{id:'name',header:'Name',accessor:r=>r.name}];
 it('paginates exactly ten rows and preserves numeric sorting',()=>{expect(tablePage(rows,'',columns,null,0).rows.map(r=>r.id)).toEqual([0,1,2,3,4,5,6,7,8,9]);expect(tablePage(rows,'',columns,{id:'id',desc:true},2).rows.map(r=>r.id)).toEqual([0]);});
 it('searches and paginates from table controls',()=>{render(<DataTable rows={rows} columns={columns} rowKey={r=>r.id}/>);fireEvent.click(screen.getByRole('button',{name:'Next page'}));expect(screen.getByText('Record 10')).toBeInTheDocument();fireEvent.change(screen.getByRole('textbox',{name:'Search records'}),{target:{value:'Record 20'}});expect(screen.getByText('Record 20')).toBeInTheDocument();expect(screen.queryByText('Record 10')).toBeNull();});
 it.each([['REGULAR',150],['PREMIUM',250],['RECLINER',400]])('keeps %s price display-only at %i',(value,price)=>{expect(seatCategoryOptions.find(o=>o.value===value)?.displayPrice).toBe(price);});
 it('validates supplied image type and size boundaries',()=>{expect(validateImage({type:'image/png',size:100},['image/png'],100)).toBe('');expect(validateImage({type:'image/png',size:101},['image/png'],100)).toBe('File too large');expect(validateImage({type:'text/html',size:1},['image/png'],100)).toBe('Unsupported file format');});
 it('normalizes backend validation arrays and maps',()=>{expect(getApiErrorMessage({response:{status:400,data:{errors:[{field:'name',defaultMessage:'Required'}]}}})).toBe('name: Required');expect(getApiErrorMessage({response:{status:400,data:{fieldErrors:{name:'Required'}}}})).toBe('name: Required');});
 it.each([[400,'Invalid data'],[403,"You don't have permission"],[404,'Not found'],[409,'Conflict: item already exists or is in use'],[413,'File too large'],[415,'Unsupported file format'],[500,'Server error, try again']])('uses the defensive fallback for %s',(status,message)=>{expect(getApiErrorMessage({response:{status}})).toBe(message);});
});