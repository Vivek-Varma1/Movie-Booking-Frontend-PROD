import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { ConfirmDialog } from '@/admin/components/ConfirmDialog';
import { FormDialog } from '@/admin/components/FormDialog';
afterEach(cleanup);
it('requires the exact item name before confirming deletion',()=>{
 const confirm=vi.fn();render(<ConfirmDialog open onOpenChange={vi.fn()} title="Delete" confirmName="Cinema" onConfirm={confirm}/>);
 const button=screen.getByRole('button',{name:'Confirm'});expect(button).toBeDisabled();
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'cinema'}});expect(button).toBeDisabled();
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Cinema'}});fireEvent.click(button);expect(confirm).toHaveBeenCalledTimes(1);
});
it('blocks close and duplicate submission while a form is submitting',()=>{
 const close=vi.fn(),submit=vi.fn();render(<FormDialog open onOpenChange={close} title="Edit" submitting onSubmit={submit}><input aria-label="Name"/></FormDialog>);
 fireEvent.click(screen.getByRole('button',{name:'Close'}));expect(close).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Save'})).toBeDisabled();expect(screen.getByRole('button',{name:'Cancel'})).toBeDisabled();
});