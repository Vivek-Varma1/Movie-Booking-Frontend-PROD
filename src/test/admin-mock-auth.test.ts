import { describe, expect, it, vi } from 'vitest';
vi.mock('@/theme/theme',()=>({appConfig:{useMock:true}}));
import { getCurrentUser, logout, verifyOtp } from '@/services/api';
describe('explicit mock identity',()=>{
 it('uses only 123456 and grants admin only to admin@demo.com',async()=>{
  sessionStorage.clear(); await expect(verifyOtp('admin@demo.com','111111')).rejects.toThrow('Invalid OTP');
  expect((await verifyOtp('admin@demo.com','123456')).user.role).toBe('ADMIN');
  expect(sessionStorage.getItem('cv_mock_identity')).toBe('admin@demo.com');
  expect((await getCurrentUser())?.role).toBe('ADMIN');await logout();expect(await getCurrentUser()).toBeNull();
  expect((await verifyOtp('guest@example.com','123456')).user.role).toBe('USER');await logout();
 });
});