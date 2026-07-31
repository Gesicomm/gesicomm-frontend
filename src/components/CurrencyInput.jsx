import React from 'react';
import { NumericFormat } from 'react-number-format';

export default function CurrencyInput({ value, onChange, placeholder, disabled, id, className, style, onBlur, onKeyDown, prefix = 'Gs ' }) {
  return (
    <NumericFormat
      id={id}
      className={className}
      style={{ textAlign: 'right', ...style }}
      value={value}
      onValueChange={(values) => {
        // values.floatValue is the unformatted number
        onChange(values.floatValue === undefined ? '' : values.floatValue);
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={0}
      prefix={prefix}
      placeholder={placeholder || '0'}
      disabled={disabled}
      allowNegative={false}
    />
  );
}
