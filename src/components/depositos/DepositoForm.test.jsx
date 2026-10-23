import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import DepositoForm from './DepositoForm';
vi.mock('../../services/courierApi', () => ({ getCourierGeografia: vi.fn().mockResolvedValue([]) }));

test.each(['Cerrar formulario de depósito', 'Cancelar'])('%s cierra directamente sin cambios', (name) => {
 const onClose=vi.fn();render(<DepositoForm onClose={onClose} onSubmit={vi.fn()} />);
 fireEvent.click(screen.getByRole('button',{name,exact:true}));expect(onClose).toHaveBeenCalledOnce();
});
test('la confirmación de cambios queda antes de los campos y permite continuar o cerrar', () => {
 const onClose=vi.fn();render(<DepositoForm onClose={onClose} onSubmit={vi.fn()} />);
 const field=screen.getByRole('textbox',{name:'Nombre del depósito',exact:true});fireEvent.change(field,{target:{value:'Central'}});
 fireEvent.click(screen.getByRole('button',{name:'Cerrar formulario de depósito'}));expect(onClose).not.toHaveBeenCalled();
 const alert=screen.getByRole('alert');expect(alert.compareDocumentPosition(field)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(document.activeElement).toBe(screen.getByRole('button',{name:'Seguir editando'}));
 fireEvent.click(screen.getByRole('button',{name:'Seguir editando'}));expect(screen.queryByRole('alert')).toBeNull();expect(field.value).toBe('Central');
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});fireEvent.click(screen.getByRole('button',{name:'Descartar y cerrar'}));expect(onClose).toHaveBeenCalledOnce();
});
test('Escape cierra sin cambios y no cierra durante el guardado', () => {
 const onClose=vi.fn();const {rerender}=render(<DepositoForm onClose={onClose} onSubmit={vi.fn()} loading />);
 fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(onClose).not.toHaveBeenCalled();
 rerender(<DepositoForm onClose={onClose} onSubmit={vi.fn()} />);fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(onClose).toHaveBeenCalledOnce();
});

