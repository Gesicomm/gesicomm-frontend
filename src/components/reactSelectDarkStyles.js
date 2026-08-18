// Estilos compartidos de react-select para el tema oscuro del dashboard.
// Extraído de pages/Ads.jsx para reutilizarlo en el modal de "Nueva
// Campaña" y otros selects del módulo de Meta Ads sin duplicarlo.
export const selectStylesDark = {
    control: (base, state) => ({
        ...base,
        background: '#141416',
        borderColor: state.isFocused ? 'var(--bg-primary)' : 'var(--border-border)',
        boxShadow: 'none',
        borderRadius: '6px',
        padding: '0',
        minHeight: '38px',
        '&:hover': {
            borderColor: 'var(--bg-primary)'
        }
    }),
    menu: (base) => ({
        ...base,
        background: '#141416',
        border: '1px solid var(--border-border)',
        zIndex: 20
    }),
    option: (base, state) => ({
        ...base,
        background: state.isFocused ? '#1a1a1c' : '#141416',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '0.85rem',
        '&:active': {
            background: 'rgba(255, 255, 255, 0.1)'
        }
    }),
    singleValue: (base) => ({
        ...base,
        color: '#fff',
        fontSize: '0.85rem'
    }),
    multiValue: (base) => ({
        ...base,
        background: 'rgba(109, 94, 248, 0.15)',
    }),
    multiValueLabel: (base) => ({
        ...base,
        color: '#fff',
        fontSize: '0.8rem'
    }),
    input: (base) => ({
        ...base,
        color: '#fff',
        fontSize: '0.85rem'
    })
};
