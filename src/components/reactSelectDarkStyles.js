// Estilos compartidos de react-select para el tema oscuro del dashboard.
// Extraído de pages/Ads.jsx para reutilizarlo en el modal de "Nueva
// Campaña" y otros selects del módulo de Meta Ads sin duplicarlo.
export const selectStylesDark = {
    control: (base, state) => ({
        ...base,
        background: 'var(--color-surface)',
        borderColor: state.isFocused ? 'var(--color-primary)' : 'var(--color-border)',
        boxShadow: 'none',
        borderRadius: '6px',
        padding: '0',
        minHeight: '38px',
        '&:hover': {
            borderColor: 'var(--color-primary)'
        }
    }),
    menu: (base) => ({
        ...base,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        zIndex: 20
    }),
    option: (base, state) => ({
        ...base,
        background: state.isFocused ? 'var(--color-surface-2)' : 'var(--color-surface)',
        color: 'var(--color-fg)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        '&:active': {
            background: 'var(--color-surface-3)'
        }
    }),
    singleValue: (base) => ({
        ...base,
        color: 'var(--color-fg)',
        fontSize: '0.85rem'
    }),
    multiValue: (base) => ({
        ...base,
        background: 'var(--bg-primary-soft)',
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: 'var(--color-fg)',
        fontSize: '0.8rem'
    }),
    input: (base) => ({
        ...base,
        color: 'var(--color-fg)',
        fontSize: '0.85rem'
    })
};
