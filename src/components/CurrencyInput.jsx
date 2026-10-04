import React from 'react';
import { NumericFormat } from 'react-number-format';

export default function CurrencyInput({ value, onChange, placeholder, disabled, id, className, style, onBlur, onKeyDown, prefix = 'Gs ', decimals = 0, 'aria-invalid': ariaInvalid, 'aria-label': ariaLabel }) {
  return (
    <NumericFormat
      id={id}
      aria-invalid={ariaInvalid}
      aria-label={ariaLabel}
      className={className}
      style={{ textAlign: 'right', ...style }}
      value={value}
      onValueChange={(values, sourceInfo) => {
        // Un valor recibido por props (por ejemplo, después de guardar) no
        // es una nueva edición del usuario.
        if (sourceInfo.source === 'prop') return;
        // values.floatValue is the unformatted number
        onChange(values.floatValue === undefined ? '' : values.floatValue);
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={decimals}
      prefix={prefix}
      placeholder={placeholder || '0'}
      disabled={disabled}
      allowNegative={false}
    />
  );
}
